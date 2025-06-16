document.addEventListener('DOMContentLoaded', () => {
    // ================== CONFIGURATION & STATE ==================
    const METER_TO_FEET = 3.28084;
    let map, activeMapContext, selectionMarker; // 'selectionMarker' is the key fix
    let proposedBuilding = { name: '', nec: 0, type: '', use: '' };
    let violationChartInstance = null;
    let mapLayers = { proposed: [], surrounding: [] };

    // ================== ELEMENT SELECTORS ==================
    const modal = document.getElementById('mapModal');
    const formContainer = document.querySelector('body');
    const table1Body = document.getElementById('proposedToSurroundingTable-body');
    const table2Body = document.getElementById('surroundingToProposedTable-body');
    const violationSummaryBody = document.getElementById('violationSummaryTable-body');
    const violationSummarySection = document.getElementById('violationSummarySection');
    const chartSection = document.getElementById('chartSection');
    const unitSelector = document.getElementById('unitSelector');

    // ================== VALIDATION ==================
    const validateAndHighlight = () => {
        let isValid = true;
        const fieldsToValidate = [
            'proposedBldgNec', 'proposedBldgLat', 'proposedBldgLon', 'buildingType', 'buildingUse'
        ];
        
        fieldsToValidate.forEach(id => {
            const field = document.getElementById(id);
            let fieldValid = true;
            if (!field.value) {
                fieldValid = false;
            } else if (field.id !== 'buildingType' && field.id !== 'buildingUse' && isNaN(parseFloat(field.value))) {
                fieldValid = false;
            }
            field.classList.toggle('invalid-input', !fieldValid);
            if (!fieldValid) isValid = false;
        });
        
        table1Body.querySelectorAll('tr').forEach(row => {
            const necInput = table2Body.querySelector(`[data-row-id="${row.id}"] .reverse-nec`);
            const latInput = row.querySelector('.surrounding-bldg-lat');
            const lonInput = row.querySelector('.surrounding-bldg-lon');

            [necInput, latInput, lonInput].forEach(input => {
                if(input){
                    let inputValid = true;
                    if(!input.value || isNaN(parseFloat(input.value))) {
                        inputValid = false;
                    }
                    input.classList.toggle('invalid-input', !inputValid);
                    if (!inputValid) isValid = false;
                }
            });
        });

        return isValid;
    };


    // ================== CORE LOGIC & CALCULATIONS ==================

    const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
        if ([lat1, lon1, lat2, lon2].some(coord => isNaN(coord) || coord === null)) return 0;
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin((φ2 - φ1) / 2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const calculateQdInMeters = (nec_in_kg, buildingType) => {
        if (isNaN(nec_in_kg) || nec_in_kg <= 0 || !buildingType) return { siqd: 0, piqd: 0 };
        const Z = Math.pow(nec_in_kg / 1, 1 / 3);
        let siqdFactor = 0, piqdFactor = 0;
        switch (buildingType) {
            case 'ESH': siqdFactor = 2.4; piqdFactor = 8; break;
            case 'Igloo': siqdFactor = 0.5; piqdFactor = 7; break;
            case 'Bunker': siqdFactor = 2; piqdFactor = 4; break;
            case 'Process': siqdFactor = 2.4; piqdFactor = 8; break;
        }
        return { siqd: siqdFactor * Z, piqd: piqdFactor * Z };
    };

    const runFullAnalysis = () => {
        validateAndHighlight();
        const selectedUnit = unitSelector.value;
        const conversionFactor = selectedUnit === 'ft' ? METER_TO_FEET : 1;
        document.querySelectorAll('.unit-label').forEach(label => label.textContent = selectedUnit);

        // 1. Update Proposed Building State
        proposedBuilding.name = document.getElementById('proposedBldgName').value || 'Proposed Bldg (X)';
        const proposedLat = parseFloat(document.getElementById('proposedBldgLat').value);
        const proposedLon = parseFloat(document.getElementById('proposedBldgLon').value);
        proposedBuilding.nec = parseFloat(document.getElementById('proposedBldgNec').value);
        proposedBuilding.type = document.getElementById('buildingType').value;
        proposedBuilding.use = document.getElementById('buildingUse').value;
        const proposedQdMeters = calculateQdInMeters(proposedBuilding.nec, proposedBuilding.type);

        // 2. Update Table 1 (X -> Y)
        table1Body.querySelectorAll('tr').forEach(row => {
            row.querySelector('.proposed-bldg-name').textContent = proposedBuilding.name;
            row.querySelector('.siqd-required').textContent = (proposedQdMeters.siqd * conversionFactor).toFixed(2);
            row.querySelector('.piqd-required').textContent = (proposedQdMeters.piqd * conversionFactor).toFixed(2);
            
            const sLat = parseFloat(row.querySelector('.surrounding-bldg-lat').value);
            const sLon = parseFloat(row.querySelector('.surrounding-bldg-lon').value);
            const distanceMeters = calculateHaversineDistance(proposedLat, proposedLon, sLat, sLon);
            
            row.querySelector('.distance-available').textContent = (distanceMeters * conversionFactor).toFixed(2);
            row.dataset.distanceMeters = distanceMeters;

            const remarksOutput = row.querySelector('.remarks-output');
            if (distanceMeters > 0) {
                const requiredDistMeters = proposedBuilding.use === 'Process' ? proposedQdMeters.piqd : proposedQdMeters.siqd;
                remarksOutput.textContent = distanceMeters >= requiredDistMeters ? '✔️ Safe' : '❌ Violation';
                remarksOutput.className = distanceMeters >= requiredDistMeters ? 'remarks-output safe' : 'remarks-output violation';
            } else {
                remarksOutput.textContent = '';
                remarksOutput.className = 'remarks-output';
            }
        });
        
        syncAndAnalyzeReverseTable();
        updateViolationSummaryAndChart();
        updateMapOverlays();
    };

    const syncAndAnalyzeReverseTable = () => {
        const surroundingRows = Array.from(table1Body.querySelectorAll('tr'));
        const reverseRows = Array.from(table2Body.querySelectorAll('tr'));
        const selectedUnit = unitSelector.value;
        const conversionFactor = selectedUnit === 'ft' ? METER_TO_FEET : 1;

        while (reverseRows.length < surroundingRows.length) {
            const newRow = table2Body.insertRow();
            newRow.innerHTML = `
                <td class="sur-name-reverse"></td>
                <td><input type="text" class="reverse-nec" placeholder="e.g., 1000"></td>
                <td>
                    <select class="reverse-type">
                        <option value="ESH">ESH</option>
                        <option value="Igloo" selected>Igloo</option>
                        <option value="Bunker">Bunker</option>
                        <option value="Process">Process</option>
                    </select>
                </td>
                <td>
                    <select class="reverse-use">
                        <option value="Storage" selected>Storage</option>
                        <option value="Process">Process</option>
                    </select>
                </td>
                <td><input type="text" class="reverse-hazard" placeholder="e.g., 1.1"></td>
                <td class="reverse-siqd"></td>
                <td class="reverse-piqd"></td>
                <td class="reverse-distance"></td>
                <td class="remarks-output"></td>
            `;
            reverseRows.push(newRow);
        }
        while (reverseRows.length > surroundingRows.length) {
            reverseRows.pop().remove();
        }

        surroundingRows.forEach((sRow, index) => {
            const rRow = reverseRows[index];
            rRow.dataset.rowId = sRow.id; // Link rows
            rRow.querySelector('.sur-name-reverse').textContent = sRow.querySelector('.surrounding-bldg-name').value || `Surrounding #${index + 1}`;
            
            const distanceMeters = parseFloat(sRow.dataset.distanceMeters || 0);
            rRow.querySelector('.reverse-distance').textContent = (distanceMeters * conversionFactor).toFixed(2);

            const nec = parseFloat(rRow.querySelector('.reverse-nec').value);
            const type = rRow.querySelector('.reverse-type').value;
            const useType = rRow.querySelector('.reverse-use').value;
            const qdMeters = calculateQdInMeters(nec, type);
            
            rRow.querySelector('.reverse-siqd').textContent = (qdMeters.siqd * conversionFactor).toFixed(2);
            rRow.querySelector('.reverse-piqd').textContent = (qdMeters.piqd * conversionFactor).toFixed(2);

            const remarksOutput = rRow.querySelector('.remarks-output');
            if(distanceMeters > 0) {
                 const requiredDistMeters = useType === 'Process' ? qdMeters.piqd : qdMeters.siqd;
                 remarksOutput.textContent = distanceMeters >= requiredDistMeters ? '✔️ Safe' : '❌ Violation';
                 remarksOutput.className = distanceMeters >= requiredDistMeters ? 'remarks-output safe' : 'remarks-output violation';
            } else {
                remarksOutput.textContent = '';
                remarksOutput.className = 'remarks-output';
            }
        });
    };

     const updateViolationSummaryAndChart = () => {
    violationSummaryBody.innerHTML = '';
    const selectedUnit = unitSelector.value;
    const conversionFactor = selectedUnit === 'ft' ? METER_TO_FEET : 1;
    let violationsForChart = [];

    // --- Process Table 1 (Proposed -> Surrounding) ---
    table1Body.querySelectorAll('tr').forEach((row, index) => {
        const sName = row.querySelector('.surrounding-bldg-name').value || `Surrounding #${index + 1}`;
        const availDistMeters = parseFloat(row.dataset.distanceMeters);
        const pQD = calculateQdInMeters(proposedBuilding.nec, proposedBuilding.type);
        const reqDistMeters = proposedBuilding.use === 'Process' ? pQD.piqd : pQD.siqd;
        
        // Check for violation and calculate shortfall
        const shortfall = ((availDistMeters - reqDistMeters) / reqDistMeters) * 100;
        const isViolation = shortfall < 0;

        // Prepare the text and classes for the new columns
        const shortfallText = isViolation ? shortfall.toFixed(1) + '%' : 'N/A';
        const shortfallClass = isViolation ? 'shortfall-cell' : ''; // Style for violation shortfall
        const statusText = isViolation ? '❌ Violation' : '✔️ Safe';
        const statusClass = isViolation ? 'violation' : 'safe';
        let remarks = isViolation ? "Review layout or NEC." : "Distance requirement met.";

        if (isViolation) {
            if (shortfall >= -30 && shortfall < -10) remarks = "Reduce NEC or relocate.";
            else if (shortfall < -30) remarks = "Consider Bunker or major redesign.";
            
            violationsForChart.push({
                label: `${proposedBuilding.name} → ${sName}`,
                required: reqDistMeters,
                available: availDistMeters
            });
        }

        // Create the new 6-column row structure
        const newRow = `
            <tr>
                <td>${proposedBuilding.name} → ${sName}</td>
                <td>${(reqDistMeters * conversionFactor).toFixed(2)}</td>
                <td>${(availDistMeters * conversionFactor).toFixed(2)}</td>
                <td class="${shortfallClass}">${shortfallText}</td>
                <td class="remarks-output ${statusClass}">${statusText}</td>
                <td>${remarks}</td>
            </tr>`;
        violationSummaryBody.insertAdjacentHTML('beforeend', newRow);
    });

    // --- Process Table 2 (Surrounding -> Proposed) ---
    table2Body.querySelectorAll('tr').forEach((row, index) => {
        const sName = row.querySelector('.sur-name-reverse').textContent;
        const availDistMeters = parseFloat(table1Body.querySelectorAll('tr')[index].dataset.distanceMeters);
        const nec = parseFloat(row.querySelector('.reverse-nec').value);
        const type = row.querySelector('.reverse-type').value;
        const use = row.querySelector('.reverse-use').value;
        const sQD = calculateQdInMeters(nec, type);
        const reqDistMeters = use === 'Process' ? sQD.piqd : sQD.siqd;

        const shortfall = ((availDistMeters - reqDistMeters) / reqDistMeters) * 100;
        const isViolation = shortfall < 0;

        const shortfallText = isViolation ? shortfall.toFixed(1) + '%' : 'N/A';
        const shortfallClass = isViolation ? 'shortfall-cell' : '';
        const statusText = isViolation ? '❌ Violation' : '✔️ Safe';
        const statusClass = isViolation ? 'violation' : 'safe';
        let remarks = isViolation ? "Review layout or NEC of surrounding bldg." : "Distance requirement met.";
        
        if (isViolation) {
            if (shortfall >= -30 && shortfall < -10) remarks = "Reduce NEC or relocate.";
            else if (shortfall < -30) remarks = "Consider Bunker or major redesign.";
            
            violationsForChart.push({
                label: `${sName} → ${proposedBuilding.name}`,
                required: reqDistMeters,
                available: availDistMeters
            });
        }
        
        // Create the new 6-column row structure
        const newRow = `
            <tr>
                <td>${sName} → ${proposedBuilding.name}</td>
                <td>${(reqDistMeters * conversionFactor).toFixed(2)}</td>
                <td>${(availDistMeters * conversionFactor).toFixed(2)}</td>
                <td class="${shortfallClass}">${shortfallText}</td>
                <td class="remarks-output ${statusClass}">${statusText}</td>
                <td>${remarks}</td>
            </tr>`;
        violationSummaryBody.insertAdjacentHTML('beforeend', newRow);
    });


    // --- Update Section Visibility ---
    // The summary is now ALWAYS visible
     violationSummarySection.style.display = 'block';
    const violationsFound = violationsForChart.length > 0;
    chartSection.style.display = violationsFound ? 'block' : 'none';

    if (violationChartInstance) violationChartInstance.destroy();
    if (violationsFound) {
        const ctx = document.getElementById('violationChart').getContext('2d');
        violationChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: violationsForChart.map(v => v.label),
                datasets: [{
                    label: `Required Distance (${selectedUnit})`,
                    data: violationsForChart.map(v => (v.required * conversionFactor).toFixed(2)),
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }, {
                    label: `Available Distance (${selectedUnit})`,
                    data: violationsForChart.map(v => (v.available * conversionFactor).toFixed(2)),
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: { scales: { y: { beginAtZero: true } } }
        });
    }
};

    const addSurroundingRow = () => {
        const rowId = `row-${Date.now()}`;
        const newRow = table1Body.insertRow();
        newRow.id = rowId;
        newRow.innerHTML = `
            <td class="proposed-bldg-name"></td>
            <td>
                <input type="text" class="surrounding-bldg-name" placeholder="Name/No. of Surrounding Bldg">
                <div class="inline-group coord-group">
                    <input type="text" class="surrounding-bldg-lat" placeholder="Latitude">
                    <input type="text" class="surrounding-bldg-lon" placeholder="Longitude">
                </div>
                 <button type="button" class="map-btn">Set on Map</button>
            </td>
            <td class="siqd-required"></td>
            <td class="piqd-required"></td>
            <td class="distance-available"></td>
            <td class="remarks-output"></td>
        `;
        runFullAnalysis();
    };

    // ================== MAP & MODAL LOGIC (REVISED) ==================
    const handleMapClick = (e) => {
        const latlng = e.latlng;
        if (selectionMarker) {
            selectionMarker.setLatLng(latlng);
        } else {
            selectionMarker = L.marker(latlng, { draggable: true }).addTo(map);
        }
    };
    
    const openMapModal = (context) => {
        activeMapContext = context;
        modal.style.display = 'block';
        setTimeout(() => {
            if (!map) {
                map = L.map('map').setView([28.6139, 77.2090], 10);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            }
            map.invalidateSize();
            updateMapOverlays(); // Show existing building markers
    
            // Attach the click listener for setting a new location
            map.on('click', handleMapClick);
        }, 10);
    };
    
    const closeModalAndCleanup = () => {
        if (selectionMarker) {
            map.removeLayer(selectionMarker);
            selectionMarker = null;
        }
        map.off('click', handleMapClick);
        modal.style.display = 'none';
    };

    const updateMapOverlays = () => {
        if (!map) return;
        // Clear previous layers
        mapLayers.proposed.forEach(layer => layer && map.removeLayer(layer));
        mapLayers.surrounding.forEach(layer => layer && map.removeLayer(layer));
        mapLayers = { proposed: [], surrounding: [] };

        // Draw Proposed Building Layers
        const pLat = parseFloat(document.getElementById('proposedBldgLat').value);
        const pLon = parseFloat(document.getElementById('proposedBldgLon').value);
        if (!isNaN(pLat) && !isNaN(pLon)) {
            const pQD = calculateQdInMeters(proposedBuilding.nec, proposedBuilding.type);
            
            // SIQD = Red, PIQD = Blue
            const siqdCircle = L.circle([pLat, pLon], { radius: pQD.siqd, color: 'red', weight: 2, fillOpacity: 0.1}).bindTooltip("Proposed SIQD");
            const piqdCircle = L.circle([pLat, pLon], { radius: pQD.piqd, color: 'blue', weight: 2, fillOpacity: 0.1}).bindTooltip("Proposed PIQD");
            const centerMarker = L.marker([pLat, pLon]).bindTooltip(proposedBuilding.name || "Proposed Building");
            
            mapLayers.proposed = [siqdCircle, piqdCircle, centerMarker];
            mapLayers.proposed.forEach(layer => layer.addTo(map));
        }

        // Draw Surrounding Building Layers
        table2Body.querySelectorAll('tr').forEach((row, index) => {
            const sLat = parseFloat(table1Body.querySelectorAll('tr')[index].querySelector('.surrounding-bldg-lat').value);
            const sLon = parseFloat(table1Body.querySelectorAll('tr')[index].querySelector('.surrounding-bldg-lon').value);
            const sNec = parseFloat(row.querySelector('.reverse-nec').value);
            const sType = row.querySelector('.reverse-type').value;
            const sName = row.querySelector('.sur-name-reverse').textContent;

            if (!isNaN(sLat) && !isNaN(sLon)) {
                 const sMarker = L.marker([sLat, sLon]).bindTooltip(sName);
                 mapLayers.surrounding.push(sMarker);
                 
                if(!isNaN(sNec) && sType) {
                    const sQD = calculateQdInMeters(sNec, sType);
                    // Dashed circles for surrounding buildings: SIQD=Red, PIQD=Blue
                    const sSiqdCircle = L.circle([sLat, sLon], { radius: sQD.siqd, color: 'red', weight: 1, dashArray: '5, 5', fillOpacity: 0.05 }).bindTooltip(`${sName} - SIQD`);
                    const sPiqdCircle = L.circle([sLat, sLon], { radius: sQD.piqd, color: 'blue', weight: 1, dashArray: '5, 5', fillOpacity: 0.05 }).bindTooltip(`${sName} - PIQD`);
                    mapLayers.surrounding.push(sSiqdCircle, sPiqdCircle);
                }
            }
        });
        mapLayers.surrounding.forEach(layer => layer.addTo(map));
    };

    document.getElementById('confirmLocationBtn').addEventListener('click', () => {
        if (!selectionMarker) {
            alert("Please click on the map to select a location.");
            return;
        }
        const latlng = selectionMarker.getLatLng();

        if (activeMapContext.type === 'proposed') {
            document.getElementById('proposedBldgLat').value = latlng.lat.toFixed(6);
            document.getElementById('proposedBldgLon').value = latlng.lng.toFixed(6);
        } else { // type is 'surrounding'
            activeMapContext.row.querySelector('.surrounding-bldg-lat').value = latlng.lat.toFixed(6);
            activeMapContext.row.querySelector('.surrounding-bldg-lon').value = latlng.lng.toFixed(6);
        }
        
        closeModalAndCleanup();
        runFullAnalysis(); // Trigger analysis after setting coordinates
    });

    document.getElementById('cancelModalBtn').addEventListener('click', closeModalAndCleanup);
    
    // ================== EVENT HANDLERS & INITIALIZATION ==================
    formContainer.addEventListener('input', runFullAnalysis);
    document.getElementById('addSurroundingBtn').addEventListener('click', addSurroundingRow);
    
    document.getElementById('setProposedLocationBtn').addEventListener('click', () => {
        openMapModal({ type: 'proposed' });
    });
    
    table1Body.addEventListener('click', e => {
        if (e.target.classList.contains('map-btn')) {
            openMapModal({ type: 'surrounding', row: e.target.closest('tr') });
        }
    });
    
    addSurroundingRow();
    runFullAnalysis();
});
