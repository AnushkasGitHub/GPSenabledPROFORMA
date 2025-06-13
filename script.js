document.addEventListener('DOMContentLoaded', () => {
    // ================== CONFIGURATION & STATE ==================
    let map, marker, activeMapContext;
    let rowCounter = 0;
    let proposedBuilding = { name: '', location: null, nec: 0, type: '', use: '' };

    // ================== ELEMENT SELECTORS ==================
    const modal = document.getElementById('mapModal');
    const formContainer = document.querySelector('body');
    const table1Body = document.getElementById('proposedToSurroundingTable-body');
    const table2Body = document.getElementById('surroundingToProposedTable-body');
    const violationSummaryBody = document.getElementById('violationSummaryTable-body');
    const violationSummarySection = document.getElementById('violationSummarySection');

    // ================== CORE LOGIC & CALCULATIONS ==================

    /**
     * Calculates both SIQD and PIQD based on building type and NEC.
     * @param {number} nec_in_kg - Net Explosive Content in kg.
     * @param {string} buildingType - Type like 'ESH', 'Igloo', etc.
     * @returns {object} - { siqd, piqd }
     */
    const calculateDistances = (nec_in_kg, buildingType) => {
        if (isNaN(nec_in_kg) || nec_in_kg <= 0 || !buildingType) {
            return { siqd: '0.00', piqd: '0.00' };
        }
        const Z = Math.pow(nec_in_kg / 1000, 1 / 3);
        let siqdFactor = 0, piqdFactor = 0;

        switch (buildingType) {
            case 'ESH': siqdFactor = 2.4; piqdFactor = 8; break;
            case 'Igloo': siqdFactor = 0.5; piqdFactor = 7; break;
            case 'Bunker': siqdFactor = 2; piqdFactor = 4; break;
            case 'Process': siqdFactor = 2.4; piqdFactor = 8; break;
        }
        return {
            siqd: (siqdFactor * Z).toFixed(2),
            piqd: (piqdFactor * Z).toFixed(2)
        };
    };

    /**
     * The master function to update all tables and analyses in real-time.
     */
    const runFullAnalysis = () => {
        // 1. Update Proposed Building State from UI
        proposedBuilding.name = document.getElementById('proposedBldgName').value || 'Proposed Bldg (X)';
        proposedBuilding.nec = parseFloat(document.getElementById('proposedBldgNec').value);
        proposedBuilding.type = document.getElementById('buildingType').value;
        proposedBuilding.use = document.getElementById('buildingUse').value;
        const proposedQD = calculateDistances(proposedBuilding.nec, proposedBuilding.type);

        // 2. Update Table 1 (X -> Y) for each surrounding building row
        table1Body.querySelectorAll('tr').forEach(row => {
            // Populate with data from proposed building
            row.querySelector('.proposed-bldg-name').value = proposedBuilding.name;
            row.querySelector('.siqd-required').value = proposedQD.siqd;
            row.querySelector('.piqd-required').value = proposedQD.piqd;
            
            // Calculate distance and check for violations
            const distanceOutput = row.querySelector('.distance-available');
            const remarksOutput = row.querySelector('.remarks-output');
            const surroundingLocation = row.dataset.location ? JSON.parse(row.dataset.location) : null;

            if (proposedBuilding.location && surroundingLocation) {
                const distance = L.latLng(proposedBuilding.location).distanceTo(L.latLng(surroundingLocation)).toFixed(2);
                distanceOutput.value = distance;
                
                const requiredDist = proposedBuilding.use === 'Process' ? proposedQD.piqd : proposedQD.siqd;
                remarksOutput.value = parseFloat(distance) >= parseFloat(requiredDist) ? '✔️ Safe' : '❌ Violation (X→Y)';
            }
        });
        
        // 3. Update Table 2 (Y -> X) based on Table 1
        syncAndAnalyzeReverseTable();
        
        // 4. Update Final Violation Summary
        updateViolationSummary();
    };

    /**
     * Syncs Table 2 from Table 1 and runs reverse analysis.
     */
    const syncAndAnalyzeReverseTable = () => {
        const surroundingRows = Array.from(table1Body.querySelectorAll('tr'));
        const reverseRows = Array.from(table2Body.querySelectorAll('tr'));

        // Sync row counts
        while (reverseRows.length < surroundingRows.length) {
            const newRow = table2Body.insertRow();
            newRow.innerHTML = `
                <td><input type="text" readonly></td>
                <td><input type="text" class="reverse-nec" placeholder="Enter NEC"></td>
                <td>
                    <select class="reverse-use">
                        <option value="Storage">Storage</option>
                        <option value="Process">Process</option>
                    </select>
                </td>
                <td><input type="text" class="reverse-hazard" placeholder="e.g., 1.2"></td>
                <td><input type="text" class="reverse-siqd" readonly></td>
                <td><input type="text" class="reverse-piqd" readonly></td>
                <td><input type="text" readonly></td>
                <td><input type="text" class="remarks-output" readonly></td>
            `;
            reverseRows.push(newRow);
        }
        while (reverseRows.length > surroundingRows.length) {
            reverseRows.pop().remove();
        }

        // Update data and analyze each row
        surroundingRows.forEach((sRow, index) => {
            const rRow = reverseRows[index];
            const sName = sRow.querySelector('.surrounding-bldg-name').value || `Surrounding #${index + 1}`;
            const distance = sRow.querySelector('.distance-available').value;
            
            rRow.cells[0].querySelector('input').value = sName;
            rRow.cells[6].querySelector('input').value = distance;

            const nec = parseFloat(rRow.querySelector('.reverse-nec').value);
            // Assuming Igloo type for surrounding buildings for calculation simplicity. This can be a dropdown if needed.
            const qd = calculateDistances(nec, 'Igloo');
            rRow.querySelector('.reverse-siqd').value = qd.siqd;
            rRow.querySelector('.reverse-piqd').value = qd.piqd;

            const useType = rRow.querySelector('.reverse-use').value;
            const requiredDist = useType === 'Process' ? qd.piqd : qd.siqd;

            if(distance && parseFloat(distance) > 0) {
                 rRow.querySelector('.remarks-output').value = parseFloat(distance) >= parseFloat(requiredDist) ? '✔️ Safe' : '❌ Violation (Y→X)';
            } else {
                rRow.querySelector('.remarks-output').value = '';
            }
        });
    };

    const updateViolationSummary = () => {
        violationSummaryBody.innerHTML = '';
        let violationsFound = false;

        const addViolationRow = (pName, sName, reqDist, availDist, direction) => {
            violationsFound = true;
            const shortfall = ((parseFloat(availDist) - parseFloat(reqDist)) / parseFloat(reqDist)) * 100;
            let suggestion = "Review layout immediately.";
            if (shortfall >= -30 && shortfall < -10) suggestion = "Reduce NEC or relocate 20–50m.";
            else if (shortfall < -30) suggestion = "Consider Bunker/NAT or major redesign.";

            const newRow = `<tr>
                <td>${pName} ${direction === 'X→Y' ? '→' : '←'} ${sName}</td>
                <td>${reqDist}</td><td>${availDist}</td>
                <td class="shortfall-cell">${shortfall.toFixed(1)}%</td><td>${suggestion}</td>
            </tr>`;
            violationSummaryBody.insertAdjacentHTML('beforeend', newRow);
        };
        
        // Check Table 1
        table1Body.querySelectorAll('tr').forEach(row => {
            const remarks = row.querySelector('.remarks-output').value;
            if (remarks.includes('❌')) {
                const sName = row.querySelector('.surrounding-bldg-name').value;
                const availDist = row.querySelector('.distance-available').value;
                const reqDist = proposedBuilding.use === 'Process' ? row.querySelector('.piqd-required').value : row.querySelector('.siqd-required').value;
                addViolationRow(proposedBuilding.name, sName, reqDist, availDist, 'X→Y');
            }
        });

        // Check Table 2
        table2Body.querySelectorAll('tr').forEach(row => {
            const remarks = row.querySelector('.remarks-output').value;
            if (remarks.includes('❌')) {
                const sName = row.cells[0].querySelector('input').value;
                const availDist = row.cells[6].querySelector('input').value;
                const useType = row.querySelector('.reverse-use').value;
                const reqDist = useType === 'Process' ? row.querySelector('.reverse-piqd').value : row.querySelector('.reverse-siqd').value;
                addViolationRow(proposedBuilding.name, sName, reqDist, availDist, 'Y→X');
            }
        });

        violationSummarySection.style.display = violationsFound ? 'block' : 'none';
    };

    // ================== EVENT HANDLERS & UI ==================

    const addSurroundingRow = () => {
        const newRow = table1Body.insertRow();
        newRow.innerHTML = `
            <td><input type="text" class="proposed-bldg-name" readonly></td>
            <td>
                <input type="text" class="surrounding-bldg-name" placeholder="Name/No. of Surrounding Bldg">
                <button type="button" class="map-btn">Set Location (Y)</button>
                <div class="coord-display"></div>
            </td>
            <td><input type="text" class="siqd-required" readonly></td>
            <td><input type="text" class="piqd-required" readonly></td>
            <td><input type="text" class="distance-available" readonly></td>
            <td><input type="text" class="remarks-output" readonly></td>
        `;
        runFullAnalysis();
    };

    const openMapModal = (context) => {
        activeMapContext = context;
        modal.style.display = 'block';
        setTimeout(() => {
            if (!map) {
                map = L.map('map').setView([28.6139, 77.2090], 10);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                map.on('click', (e) => {
                    if (marker) map.removeLayer(marker);
                    marker = L.marker(e.latlng).addTo(map);
                });
            }
            map.invalidateSize();
            if(marker) map.removeLayer(marker);
            marker = null;
        }, 10);
    };

    document.getElementById('confirmLocationBtn').addEventListener('click', () => {
        if (!marker) { alert("Please select a location on the map."); return; }
        const latlng = marker.getLatLng();

        if (activeMapContext.type === 'surrounding' && proposedBuilding.location) {
            if (latlng.lat === proposedBuilding.location.lat && latlng.lng === proposedBuilding.location.lon) {
                alert("Surrounding Building location cannot be the same as the Proposed Building.");
                return;
            }
        }

        if (activeMapContext.type === 'proposed') {
            proposedBuilding.location = latlng;
            document.getElementById('proposedCoordDisplay').textContent = `Lat: ${latlng.lat.toFixed(4)}, Lon: ${latlng.lng.toFixed(4)}`;
        } else {
            activeMapContext.row.dataset.location = JSON.stringify(latlng);
            activeMapContext.row.querySelector('.coord-display').textContent = `Lat: ${latlng.lat.toFixed(4)}, Lon: ${latlng.lng.toFixed(4)}`;
        }
        
        modal.style.display = 'none';
        runFullAnalysis();
    });

    // Main real-time listener for the entire form
    formContainer.addEventListener('input', runFullAnalysis);
    formContainer.addEventListener('change', runFullAnalysis);

    document.getElementById('addSurroundingBtn').addEventListener('click', addSurroundingRow);
    document.getElementById('cancelModalBtn').addEventListener('click', () => modal.style.display = 'none');
    document.getElementById('setProposedLocationBtn').addEventListener('click', () => openMapModal({ type: 'proposed' }));
    
    table1Body.addEventListener('click', e => {
        if (e.target.classList.contains('map-btn')) {
            openMapModal({ type: 'surrounding', row: e.target.closest('tr') });
        }
    });
    
    // ================== INITIALIZATION ==================
    addSurroundingRow();
});
