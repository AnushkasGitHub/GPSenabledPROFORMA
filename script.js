document.addEventListener('DOMContentLoaded', () => {
    // ================== CONFIGURATION & STATE ==================
    const METER_TO_FEET = 3.28084;
    let modalMap, outputMap, activeMapContext, selectionMarker;
    let selectionSiqdCircle, selectionPiqdCircle; // For live circles on modal map
    let proposedBuilding = { name: '', nec: 0, type: '', use: '', lat: null, lon: null }; // Initialize lat/lon to null

    // Define consistent colors for SIQD and PIQD circles
    const PIQD_COLOR = '#007bff'; // Blue (Swapped from previous)
    const SIQD_COLOR = '#ffc107'; // Amber/Yellow (Swapped from previous)

    // ================== ELEMENT SELECTORS ==================
    const modal = document.getElementById('mapModal');
    const formContainer = document.querySelector('body');
    const table1Body = document.getElementById('proposedToSurroundingTable-body');
    const table2Body = document.getElementById('surroundingToProposedTable-body');
    const violationSummaryBody = document.getElementById('violationSummaryTable-body');
    const mapOutputSection = document.getElementById('mapOutputSection');
    const unitSelector = document.getElementById('unitSelector');
    const violationSummarySection = document.getElementById('violationSummarySection'); // Get the section element
    const warningTitle = violationSummarySection.querySelector('.warning-title'); // Get the warning title

    // ================== INITIALIZATION ==================
    const initializeOutputMap = () => {
        if (!outputMap) {
            outputMap = L.map('outputMap').setView([28.6139, 77.2090], 5);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(outputMap);

            // Add Legend to the map
            const legend = L.control({position: 'bottomright'});
            legend.onAdd = function (map) {
                const div = L.DomUtil.create('div', 'leaflet-control-legend');
                div.innerHTML =
                    '<h4>Map Legend</h4>' +
                    `<i style="border-color: ${PIQD_COLOR};"></i> Proposed PIQD<br>` + // Changed order and color
                    `<i style="border-color: ${SIQD_COLOR};"></i> Proposed SIQD<br>` + // Changed order and color
                    `<i style="border-color: ${PIQD_COLOR};" class="dashed"></i> Surrounding PIQD<br>` + // Changed order and color
                    `<i style="border-color: ${SIQD_COLOR};" class="dashed"></i> Surrounding SIQD<br>` + // Changed order and color
                    '<hr style="margin: 4px 0; border-color: #ccc;">' + // separator
                    '<i style="background-color: green;" class="line"></i> Feasible Link<br>' +
                    '<i style="border-color: red;" class="line dashed"></i> Violation Link';
                return div;
            };
            legend.addTo(outputMap);
        }
    };

    // ================== VALIDATION ==================
    const validateAndHighlight = () => {
        let isValid = true;
        // NEC and coordinates are required. Type and Use are validated by select elements.
        const fieldsToValidate = ['proposedBldgNec', 'proposedBldgLat', 'proposedBldgLon'];
        fieldsToValidate.forEach(id => {
            const field = document.getElementById(id);
            let fieldValid = field.value !== '' && !isNaN(parseFloat(field.value));
            field.classList.toggle('invalid-input', !fieldValid);
            if (!fieldValid) isValid = false;
        });

        // Validate select elements (they always have a value but might be "Select...")
        const selectFieldsToValidate = ['buildingType', 'buildingUse'];
        selectFieldsToValidate.forEach(id => {
            const field = document.getElementById(id);
            let fieldValid = field.value !== ''; // Assuming empty string as invalid default
            field.classList.toggle('invalid-input', !fieldValid);
            if (!fieldValid) isValid = false;
        });

        table1Body.querySelectorAll('tr').forEach(row => {
            const necInput = table2Body.querySelector(`[data-row-id="${row.id}"] .reverse-nec`);
            const typeSelect = table2Body.querySelector(`[data-row-id="${row.id}"] .reverse-type`);
            const useSelect = table2Body.querySelector(`[data-row-id="${row.id}"] .reverse-use`);
            const latInput = row.querySelector('.surrounding-bldg-lat');
            const lonInput = row.querySelector('.surrounding-bldg-lon');

            [latInput, lonInput].forEach(input => {
                let inputValid = input.value !== '' && !isNaN(parseFloat(input.value));
                input.classList.toggle('invalid-input', !inputValid);
                if (!inputValid) isValid = false;
            });

            if (necInput) { // NEC, Type, Use are in the reverse table
                let necValid = necInput.value !== '' && !isNaN(parseFloat(necInput.value));
                necInput.classList.toggle('invalid-input', !necValid);
                if (!necValid) isValid = false;

                let typeValid = typeSelect.value !== '';
                typeSelect.classList.toggle('invalid-input', !typeValid);
                if (!typeValid) isValid = false;

                let useValid = useSelect.value !== '';
                useSelect.classList.toggle('invalid-input', !useValid);
                if (!useValid) isValid = false;
            }
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
        const Z = Math.pow(nec_in_kg, 1 / 3);
        let siqdFactor = 0, piqdFactor = 0;
        switch (buildingType) {
            case 'ESH': siqdFactor = 2.4; piqdFactor = 8; break;
            case 'Igloo': siqdFactor = 0.5; piqdFactor = 7; break;
            case 'Bunker': siqdFactor = 2; piqdFactor = 4; break;
            case 'Process': siqdFactor = 2.4; piqdFactor = 8; break;
            default: return { siqd: 0, piqd: 0 };
        }
        return { siqd: siqdFactor * Z, piqd: piqdFactor * Z };
    };

    const runFullAnalysis = () => {
        // Always update proposedBuilding details first
        proposedBuilding.name = document.getElementById('proposedBldgName').value || 'Proposed Bldg (X)';
        proposedBuilding.lat = parseFloat(document.getElementById('proposedBldgLat').value);
        proposedBuilding.lon = parseFloat(document.getElementById('proposedBldgLon').value);
        proposedBuilding.nec = parseFloat(document.getElementById('proposedBldgNec').value);
        proposedBuilding.type = document.getElementById('buildingType').value;
        proposedBuilding.use = document.getElementById('buildingUse').value;

        // Check if proposed building coordinates are valid. If not, hide map and stop.
        if (isNaN(proposedBuilding.lat) || isNaN(proposedBuilding.lon) || proposedBuilding.lat === null || proposedBuilding.lon === null) {
            mapOutputSection.style.display = 'none';
            // Only return if proposed building coordinates are essential for other calculations to proceed
            // For now, we'll let it proceed to validate other fields
        }

        if (!validateAndHighlight()) {
            mapOutputSection.style.display = 'none'; // Hide map if validation fails
            return;
        }

        const selectedUnit = unitSelector.value;
        const conversionFactor = selectedUnit === 'ft' ? METER_TO_FEET : 1;
        document.querySelectorAll('.unit-label').forEach(label => label.textContent = selectedUnit);

        const proposedQdMeters = calculateQdInMeters(proposedBuilding.nec, proposedBuilding.type);

        table1Body.querySelectorAll('tr').forEach(row => {
            row.querySelector('.proposed-bldg-name').textContent = proposedBuilding.name;
            row.querySelector('.siqd-required').textContent = (proposedQdMeters.siqd * conversionFactor).toFixed(2);
            row.querySelector('.piqd-required').textContent = (proposedQdMeters.piqd * conversionFactor).toFixed(2);

            const sLat = parseFloat(row.querySelector('.surrounding-bldg-lat').value);
            const sLon = parseFloat(row.querySelector('.surrounding-bldg-lon').value);
            const distanceMeters = calculateHaversineDistance(proposedBuilding.lat, proposedBuilding.lon, sLat, sLon);

            row.querySelector('.distance-available').textContent = (distanceMeters * conversionFactor).toFixed(2);
            row.dataset.distanceMeters = distanceMeters;

            const remarksOutput = row.querySelector('.remarks-output');
            if (distanceMeters > 0 && !isNaN(proposedBuilding.lat) && !isNaN(proposedBuilding.lon)) { // Check for valid proposed coords too
                const requiredDistMeters = proposedBuilding.use === 'Process' ? proposedQdMeters.piqd : proposedQdMeters.siqd;
                remarksOutput.textContent = distanceMeters >= requiredDistMeters ? '✔️ Safe' : '❌ Violation';
                remarksOutput.className = distanceMeters >= requiredDistMeters ? 'remarks-output safe' : 'remarks-output violation';
            } else {
                remarksOutput.textContent = 'Enter All Coordinates'; // Indicate missing info
                remarksOutput.className = 'remarks-output';
            }
        });

        syncAndAnalyzeReverseTable();
        updateViolationSummary();
        renderOutputMap();
    };

    const syncAndAnalyzeReverseTable = () => {
        const surroundingRows = Array.from(table1Body.querySelectorAll('tr'));
        const reverseRows = Array.from(table2Body.querySelectorAll('tr'));
        const selectedUnit = unitSelector.value;
        const conversionFactor = selectedUnit === 'ft' ? METER_TO_FEET : 1;

        // Add or remove rows from table2Body to match table1Body
        while (reverseRows.length < surroundingRows.length) {
            const newRow = table2Body.insertRow();
            newRow.innerHTML = `
                <td class="sur-name-reverse"></td>
                <td><input type="text" class="reverse-nec" placeholder="e.g., 1000"></td>
                <td><select class="reverse-type"><option value="">Select Type</option><option value="ESH">ESH</option><option value="Igloo">Igloo</option><option value="Bunker">Bunker</option><option value="Process">Process</option></select></td>
                <td><select class="reverse-use"><option value="">Select Use</option><option value="Storage">Storage</option><option value="Process">Process</option></select></td>
                <td><input type="text" class="reverse-hazard" placeholder="e.g., 1.1"></td>
                <td class="reverse-siqd"></td><td class="reverse-piqd"></td><td class="reverse-distance"></td><td class="remarks-output"></td>`;
            reverseRows.push(newRow);
        }
        while (reverseRows.length > surroundingRows.length) reverseRows.pop().remove();

        surroundingRows.forEach((sRow, index) => {
            const rRow = reverseRows[index];
            rRow.dataset.rowId = sRow.id; // Link reverse row to primary row
            rRow.querySelector('.sur-name-reverse').textContent = sRow.querySelector('.surrounding-bldg-name').value || `Surrounding #${index + 1}`;

            // Only update distance if available (from proposed to surrounding calculation)
            const distanceMeters = parseFloat(sRow.dataset.distanceMeters || 0);
            rRow.querySelector('.reverse-distance').textContent = (distanceMeters * conversionFactor).toFixed(2);

            const nec = parseFloat(rRow.querySelector('.reverse-nec').value);
            const type = rRow.querySelector('.reverse-type').value;
            const useType = rRow.querySelector('.reverse-use').value;
            const qdMeters = calculateQdInMeters(nec, type);

            rRow.querySelector('.reverse-siqd').textContent = (qdMeters.siqd * conversionFactor).toFixed(2);
            rRow.querySelector('.reverse-piqd').textContent = (qdMeters.piqd * conversionFactor).toFixed(2);

            const remarksOutput = rRow.querySelector('.remarks-output');
            if (distanceMeters > 0 && !isNaN(proposedBuilding.lat) && !isNaN(proposedBuilding.lon)) { // Check for valid proposed coords too
                 const requiredDistMeters = useType === 'Process' ? qdMeters.piqd : qdMeters.siqd;
                 remarksOutput.textContent = distanceMeters >= requiredDistMeters ? '✔️ Safe' : '❌ Violation';
                 remarksOutput.className = distanceMeters >= requiredDistMeters ? 'remarks-output safe' : 'remarks-output violation';
            } else {
                remarksOutput.textContent = 'Enter All Coordinates'; // Indicate missing info
                remarksOutput.className = 'remarks-output';
            }
        });
    };

    const updateViolationSummary = () => {
        violationSummaryBody.innerHTML = '';
        const selectedUnit = unitSelector.value;
        const conversionFactor = selectedUnit === 'ft' ? METER_TO_FEET : 1;
        let violationsFoundOverall = false; // Tracks if any violation exists in the entire summary
        const allSummaryPairs = {}; // Use an object to group X-Y and Y-X pairs

        const pQD = calculateQdInMeters(proposedBuilding.nec, proposedBuilding.type);

        table1Body.querySelectorAll('tr').forEach((row, index) => {
            const sName = row.querySelector('.surrounding-bldg-name').value || `Surrounding #${index + 1}`;
            const availDistMeters = parseFloat(row.dataset.distanceMeters);
            const reqDistMeters = proposedBuilding.use === 'Process' ? pQD.piqd : pQD.siqd;

            // Only add if coordinates for proposed and surrounding are valid
            if (!isNaN(proposedBuilding.lat) && !isNaN(proposedBuilding.lon) &&
                !isNaN(parseFloat(row.querySelector('.surrounding-bldg-lat').value)) &&
                !isNaN(parseFloat(row.querySelector('.surrounding-bldg-lon').value))) {

                const shortfall = ((availDistMeters - reqDistMeters) / reqDistMeters) * 100;
                const isViolation = shortfall < 0;

                // Create a unique key for the pair, e.g., "SurroundingBldgName"
                const pairKey = sName;
                if (!allSummaryPairs[pairKey]) {
                    allSummaryPairs[pairKey] = {
                        pairXY: null, // X -> Y
                        pairYX: null, // Y -> X
                        isFeasiblePair: true // Assume feasible until a violation is found for either direction
                    };
                }
                allSummaryPairs[pairKey].pairXY = {
                    pairLabel: `${proposedBuilding.name} → ${sName}`,
                    reqDist: reqDistMeters,
                    availDist: availDistMeters,
                    shortfall: shortfall,
                    isViolation: isViolation,
                };
                if (isViolation) allSummaryPairs[pairKey].isFeasiblePair = false;
            }
        });

        table2Body.querySelectorAll('tr').forEach((row, index) => {
            const sName = row.querySelector('.sur-name-reverse').textContent;
            const availDistMeters = parseFloat(table1Body.querySelectorAll('tr')[index].dataset.distanceMeters);
            const sQD = calculateQdInMeters(parseFloat(row.querySelector('.reverse-nec').value), row.querySelector('.reverse-type').value);
            const reqDistMeters = row.querySelector('.reverse-use').value === 'Process' ? sQD.piqd : sQD.siqd;

             // Only add if coordinates for proposed and surrounding are valid
            if (!isNaN(proposedBuilding.lat) && !isNaN(proposedBuilding.lon) &&
                !isNaN(parseFloat(table1Body.querySelectorAll('tr')[index].querySelector('.surrounding-bldg-lat').value)) &&
                !isNaN(parseFloat(table1Body.querySelectorAll('tr')[index].querySelector('.surrounding-bldg-lon').value))) {

                const shortfall = ((availDistMeters - reqDistMeters) / reqDistMeters) * 100;
                const isViolation = shortfall < 0;

                const pairKey = sName; // Use surrounding building name as key
                if (!allSummaryPairs[pairKey]) {
                    allSummaryPairs[pairKey] = {
                        pairXY: null,
                        pairYX: null,
                        isFeasiblePair: true
                    };
                }
                allSummaryPairs[pairKey].pairYX = {
                    pairLabel: `${sName} → ${proposedBuilding.name}`,
                    reqDist: reqDistMeters,
                    availDist: availDistMeters,
                    shortfall: shortfall,
                    isViolation: isViolation,
                };
                if (isViolation) allSummaryPairs[pairKey].isFeasiblePair = false;
            }
        });

        // Convert the grouped object back to an array for sorting and rendering
        const sortedPairKeys = Object.keys(allSummaryPairs).sort();

        sortedPairKeys.forEach(key => {
            const pairData = allSummaryPairs[key];
            if (pairData.pairXY) {
                addSummaryRow(
                    pairData.pairXY.pairLabel,
                    pairData.pairXY.reqDist,
                    pairData.pairXY.availDist,
                    pairData.pairXY.shortfall,
                    conversionFactor,
                    pairData.pairXY.isViolation,
                    pairData.isFeasiblePair // Pass the overall feasibility for the pair
                );
                if (pairData.pairXY.isViolation) violationsFoundOverall = true;
            }
            if (pairData.pairYX) {
                addSummaryRow(
                    pairData.pairYX.pairLabel,
                    pairData.pairYX.reqDist,
                    pairData.pairYX.availDist,
                    pairData.pairYX.shortfall,
                    conversionFactor,
                    pairData.pairYX.isViolation,
                    pairData.isFeasiblePair // Pass the overall feasibility for the pair
                );
                if (pairData.pairYX.isViolation) violationsFoundOverall = true;
            }
        });

        // Always show the violation summary section
        violationSummarySection.style.display = 'block';
        // Only show the warning title if there are actual violations
        warningTitle.style.display = violationsFoundOverall ? 'block' : 'none';
    };

    const addSummaryRow = (pairLabel, reqDist, availDist, shortfall, factor, isViolation, isFeasiblePair) => {
        let remarks = isViolation ? "Review layout or NEC." : "Distance requirement met.";
        if (isViolation) {
            if (shortfall >= -30 && shortfall < -10) remarks = "Reduce NEC or relocate.";
            else if (shortfall < -30) remarks = "Consider Bunker or major redesign.";
        }

        // Determine background color class for the entire row
        const rowClass = isFeasiblePair ? 'row-group-safe' : 'row-group-violation';

        const row = `
            <tr class="${rowClass}">
                <td>${pairLabel}</td>
                <td>${(reqDist * factor).toFixed(2)}</td>
                <td>${(availDist * factor).toFixed(2)}</td>
                <td class="${isViolation ? 'shortfall-cell' : ''}">${isViolation ? shortfall.toFixed(1) + '%' : 'N/A'}</td>
                <td class="remarks-output ${isViolation ? 'violation' : 'safe'}">${isViolation ? '❌ Violation' : '✔️ Safe'}</td>
                <td>${remarks}</td>
            </tr>`;
        violationSummaryBody.insertAdjacentHTML('beforeend', row);
    };

    const renderOutputMap = () => {
        if (!outputMap) initializeOutputMap();
        outputMap.eachLayer(layer => { if (layer instanceof L.TileLayer === false && !layer.options.isLegend) outputMap.removeLayer(layer); });

        const pLat = proposedBuilding.lat, pLon = proposedBuilding.lon;

        let allCoordinatesValidForMap = true;
        if (isNaN(pLat) || isNaN(pLon)) {
            allCoordinatesValidForMap = false;
        }

        table1Body.querySelectorAll('tr').forEach(row => {
            const sLat = parseFloat(row.querySelector('.surrounding-bldg-lat').value);
            const sLon = parseFloat(row.querySelector('.surrounding-bldg-lon').value);
            if (isNaN(sLat) || isNaN(sLon)) {
                allCoordinatesValidForMap = false;
            }
        });

        if (!allCoordinatesValidForMap) {
            mapOutputSection.style.display = 'none';
            return;
        }

        mapOutputSection.style.display = 'block';
        outputMap.invalidateSize();

        const pQD = calculateQdInMeters(proposedBuilding.nec, proposedBuilding.type);
        const boundaryPoints = [];

        L.marker([pLat, pLon]).addTo(outputMap).bindTooltip(`<b>${proposedBuilding.name}</b><br>(Proposed)`);
        L.circle([pLat, pLon], { radius: pQD.piqd, color: PIQD_COLOR, weight: 2, fillOpacity: 0.15 }).addTo(outputMap).bindTooltip(`Proposed PIQD: ${pQD.piqd.toFixed(1)}m`);
        L.circle([pLat, pLon], { radius: pQD.siqd, color: SIQD_COLOR, weight: 2, fillOpacity: 0.15 }).addTo(outputMap).bindTooltip(`Proposed SIQD: ${pQD.siqd.toFixed(1)}m`);
        boundaryPoints.push(L.latLng(pLat, pLon));

        // Collect all surrounding building data to determine overall feasibility for lines
        const surroundingBuildingsData = {};
        table1Body.querySelectorAll('tr').forEach(sRow => {
            const sName = sRow.querySelector('.surrounding-bldg-name').value || `Surrounding ${sRow.id}`;
            const sLat = parseFloat(sRow.querySelector('.surrounding-bldg-lat').value);
            const sLon = parseFloat(sRow.querySelector('.surrounding-bldg-lon').value);

            if (!isNaN(sLat) && !isNaN(sLon)) {
                const rRow = table2Body.querySelector(`[data-row-id="${sRow.id}"]`);
                const sNec = rRow ? parseFloat(rRow.querySelector('.reverse-nec').value) : 0;
                const sType = rRow ? rRow.querySelector('.reverse-type').value : '';
                const sUse = rRow ? rRow.querySelector('.reverse-use').value : '';

                const dist = parseFloat(sRow.dataset.distanceMeters);
                const pReq = proposedBuilding.use === 'Process' ? pQD.piqd : pQD.siqd;
                const sQD = calculateQdInMeters(sNec, sType);
                const sReq = sUse === 'Process' ? sQD.piqd : sQD.siqd;

                const isViolationXY = (dist < pReq); // X to Y violation
                const isViolationYX = (dist < sReq); // Y to X violation
                const isOverallViolation = isViolationXY || isViolationYX;

                surroundingBuildingsData[sName] = {
                    lat: sLat,
                    lon: sLon,
                    nec: sNec,
                    type: sType,
                    use: sUse,
                    qd: sQD,
                    distance: dist,
                    pRequired: pReq,
                    sRequired: sReq,
                    isOverallViolation: isOverallViolation
                };
            }
        });


        Object.entries(surroundingBuildingsData).forEach(([sName, data]) => {
            boundaryPoints.push(L.latLng(data.lat, data.lon));

            L.marker([data.lat, data.lon]).addTo(outputMap).bindTooltip(`<b>${sName}</b>`);

            // Draw surrounding building circles with consistent colors and dashed style
            L.circle([data.lat, data.lon], { radius: data.qd.piqd, color: PIQD_COLOR, weight: 2, dashArray: '5, 5', fillOpacity: 0.1 }).addTo(outputMap).bindTooltip(`${sName} - PIQD: ${data.qd.piqd.toFixed(1)}m`);
            L.circle([data.lat, data.lon], { radius: data.qd.siqd, color: SIQD_COLOR, weight: 2, dashArray: '5, 5', fillOpacity: 0.1 }).addTo(outputMap).bindTooltip(`${sName} - SIQD: ${data.qd.siqd.toFixed(1)}m`);

            // Use the overall feasibility for the line color
            const lineColor = data.isOverallViolation ? 'red' : 'green';
            const lineStyle = data.isOverallViolation ? { color: lineColor, weight: 3, dashArray: '5, 5' } : { color: lineColor, weight: 3 };

            const line = L.polyline([[pLat, pLon], [data.lat, data.lon]], lineStyle).addTo(outputMap);
            line.bindTooltip(`
                <b>${proposedBuilding.name} ↔ ${sName}</b><br>
                Status: <b style="color:${lineColor};">${data.isOverallViolation ? 'NOT FEASIBLE' : 'FEASIBLE'}</b><br>
                Available Distance: ${data.distance.toFixed(1)}m<br>
                Required (X→Y): ${data.pRequired.toFixed(1)}m<br>
                Required (Y→X): ${data.sRequired.toFixed(1)}m
            `);
        });

        if (boundaryPoints.length > 1) {
            outputMap.fitBounds(L.latLngBounds(boundaryPoints).pad(0.2));
        } else if (boundaryPoints.length === 1) {
            outputMap.setView(boundaryPoints[0], 15);
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
            <td class="siqd-required"></td><td class="piqd-required"></td><td class="distance-available"></td><td class="remarks-output"></td>`;
        syncAndAnalyzeReverseTable();
    };

    // ================== MAP MODAL LOGIC (UPDATED) ==================
    const drawContextOnModalMap = (mapInstance) => {
        mapInstance.eachLayer(layer => {
            // Keep only the TileLayer, remove markers/circles/polylines
            if (layer instanceof L.TileLayer === false) {
                mapInstance.removeLayer(layer);
            }
        });
        const boundaryPoints = [];

        // Always redraw proposed building if coordinates exist
        if (!isNaN(proposedBuilding.lat) && proposedBuilding.lat !== null && !isNaN(proposedBuilding.lon) && proposedBuilding.lon !== null) {
            const pQD = calculateQdInMeters(proposedBuilding.nec, proposedBuilding.type);
            L.marker([proposedBuilding.lat, proposedBuilding.lon]).addTo(mapInstance).bindTooltip(proposedBuilding.name || 'Proposed Building');
            L.circle([proposedBuilding.lat, proposedBuilding.lon], { radius: pQD.piqd, color: PIQD_COLOR, weight: 2, opacity: 0.7, fillOpacity: 0.1 }).addTo(mapInstance).bindTooltip('Proposed PIQD');
            L.circle([proposedBuilding.lat, proposedBuilding.lon], { radius: pQD.siqd, color: SIQD_COLOR, weight: 2, opacity: 0.7, fillOpacity: 0.1 }).addTo(mapInstance).bindTooltip('Proposed SIQD');
            boundaryPoints.push(L.latLng(proposedBuilding.lat, proposedBuilding.lon));
        }

        // Always redraw all surrounding buildings if coordinates exist
        table1Body.querySelectorAll('tr').forEach((sRow, index) => {
            const sLat = parseFloat(sRow.querySelector('.surrounding-bldg-lat').value);
            const sLon = parseFloat(sRow.querySelector('.surrounding-bldg-lon').value);

            if (isNaN(sLat) || sLat === null || isNaN(sLon) || sLon === null) return;

            const rRow = table2Body.querySelector(`[data-row-id="${sRow.id}"]`);
            const sName = rRow ? rRow.querySelector('.sur-name-reverse').textContent : `Surrounding #${index + 1}`;
            const sNec = rRow ? parseFloat(rRow.querySelector('.reverse-nec').value) : 0;
            const sType = rRow ? rRow.querySelector('.reverse-type').value : '';

            const sQD = calculateQdInMeters(sNec, sType);

            L.marker([sLat, sLon]).addTo(mapInstance).bindTooltip(sName);
            L.circle([sLat, sLon], { radius: sQD.piqd, color: PIQD_COLOR, weight: 1, dashArray: '5, 5', fillOpacity: 0.1 }).addTo(mapInstance).bindTooltip(`${sName} - PIQD`);
            L.circle([sLat, sLon], { radius: sQD.siqd, color: SIQD_COLOR, weight: 1, dashArray: '5, 5', fillOpacity: 0.1 }).addTo(mapInstance).bindTooltip(`${sName} - SIQD`);
            boundaryPoints.push(L.latLng(sLat, sLon));
        });

        // Fit map to bounds of all marked points
        if (boundaryPoints.length > 0) { // Check if there are any points to fit to
            mapInstance.fitBounds(L.latLngBounds(boundaryPoints).pad(0.3));
        } else {
            // If no points, default to a general view (e.g., [28.6139, 77.2090] at zoom 10)
            mapInstance.setView([28.6139, 77.2090], 10);
        }
    };

    const handleMapClick = (e) => {
        const latlng = e.latlng;

        // Clear previous live circles if they exist
        if (selectionSiqdCircle) {
            modalMap.removeLayer(selectionSiqdCircle);
            modalMap.removeLayer(selectionPiqdCircle);
            selectionSiqdCircle = null;
            selectionPiqdCircle = null;
        }

        if (selectionMarker) {
            selectionMarker.setLatLng(latlng);
        } else {
            selectionMarker = L.marker(latlng, { draggable: true, zIndexOffset: 1000 }).addTo(modalMap);
            selectionMarker.on('dragend', (event) => {
                handleMapClick({ latlng: event.target.getLatLng() });
            });
        }

        let nec, type;
        if (activeMapContext.type === 'proposed') {
            nec = parseFloat(document.getElementById('proposedBldgNec').value);
            type = document.getElementById('buildingType').value;
        } else {
            const reverseRow = table2Body.querySelector(`[data-row-id="${activeMapContext.row.id}"]`);
            if (reverseRow) {
                nec = parseFloat(reverseRow.querySelector('.reverse-nec').value);
                type = reverseRow.querySelector('.reverse-type').value;
            }
        }

        // Draw live circles for the currently selected point if NEC/Type are valid
        const qd = calculateQdInMeters(nec, type);
        if (qd.siqd > 0) {
            selectionPiqdCircle = L.circle(latlng, { radius: qd.piqd, color: PIQD_COLOR, weight: 2, dashArray: '5, 5', fillOpacity: 0.2, interactive: false }).addTo(modalMap);
            selectionSiqdCircle = L.circle(latlng, { radius: qd.siqd, color: SIQD_COLOR, weight: 2, dashArray: '5, 5', fillOpacity: 0.2, interactive: false }).addTo(modalMap);
        }
    };

    const openMapModal = (context) => {
        // Ensure proposedBuilding object is up-to-date before opening map
        proposedBuilding.name = document.getElementById('proposedBldgName').value || 'Proposed Bldg (X)';
        proposedBuilding.lat = parseFloat(document.getElementById('proposedBldgLat').value);
        proposedBuilding.lon = parseFloat(document.getElementById('proposedBldgLon').value);
        proposedBuilding.nec = parseFloat(document.getElementById('proposedBldgNec').value);
        proposedBuilding.type = document.getElementById('buildingType').value;
        proposedBuilding.use = document.getElementById('buildingUse').value;


        activeMapContext = context;
        modal.style.display = 'block';
        setTimeout(() => {
            if (!modalMap) {
                modalMap = L.map('map').setView([28.6139, 77.2090], 10);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(modalMap);
            }
            modalMap.invalidateSize(); // Important for map to render correctly after modal display

            drawContextOnModalMap(modalMap); // Draw existing points and fit bounds

            // If the current context has existing coordinates, place the selection marker there initially
            let initialLat, initialLon;
            if (activeMapContext.type === 'proposed') {
                initialLat = proposedBuilding.lat;
                initialLon = proposedBuilding.lon;
            } else if (activeMapContext.row) {
                initialLat = parseFloat(activeMapContext.row.querySelector('.surrounding-bldg-lat').value);
                initialLon = parseFloat(activeMapContext.row.querySelector('.surrounding-bldg-lon').value);
            }

            // Place initial marker and circles if coordinates exist for the current context
            if (!isNaN(initialLat) && initialLat !== null && !isNaN(initialLon) && initialLon !== null) {
                const initialLatLng = L.latLng(initialLat, initialLon);
                selectionMarker = L.marker(initialLatLng, { draggable: true, zIndexOffset: 1000 }).addTo(modalMap);
                selectionMarker.on('dragend', (event) => { // Add dragend listener here
                    handleMapClick({ latlng: event.target.getLatLng() });
                });
                handleMapClick({ latlng: initialLatLng }); // Simulate click to draw live circles
                modalMap.setView(initialLatLng, 15); // Zoom to this specific building
            } else {
                // If no initial coordinates for the current context, ensure marker/circles are cleared
                if (selectionMarker) modalMap.removeLayer(selectionMarker);
                selectionMarker = null;
                if (selectionSiqdCircle) modalMap.removeLayer(selectionSiqdCircle);
                if (selectionPiqdCircle) modalMap.removeLayer(selectionPiqdCircle);
                selectionSiqdCircle = null;
                selectionPiqdCircle = null;
            }

            modalMap.on('click', handleMapClick); // Add click listener for new selections
        }, 10);
    };

    const closeModalAndCleanup = () => {
        if (selectionMarker) {
            modalMap.removeLayer(selectionMarker);
            selectionMarker = null;
        }
        if (selectionSiqdCircle) {
            modalMap.removeLayer(selectionSiqdCircle);
            modalMap.removeLayer(selectionPiqdCircle);
            selectionSiqdCircle = null;
            selectionPiqdCircle = null;
        }
        modalMap.off('click', handleMapClick); // Remove click listener to prevent memory leaks
        modal.style.display = 'none';
    };

    document.getElementById('confirmLocationBtn').addEventListener('click', () => {
        if (!selectionMarker) { alert("Please click on the map to select a location."); return; }
        const latlng = selectionMarker.getLatLng();

        if (activeMapContext.type === 'proposed') {
            document.getElementById('proposedBldgLat').value = latlng.lat.toFixed(6);
            document.getElementById('proposedBldgLon').value = latlng.lng.toFixed(6);
        } else {
            activeMapContext.row.querySelector('.surrounding-bldg-lat').value = latlng.lat.toFixed(6);
            activeMapContext.row.querySelector('.surrounding-bldg-lon').value = latlng.lng.toFixed(6);
        }
        closeModalAndCleanup();
        // Trigger a change to re-run the analysis after updating coordinates
        document.getElementById('proposedBldgNec').dispatchEvent(new Event('input', { bubbles: true }));
    });

    document.getElementById('cancelModalBtn').addEventListener('click', closeModalAndCleanup);

    // ================== EVENT HANDLERS & INITIALIZATION ==================
    formContainer.addEventListener('input', runFullAnalysis);
    document.getElementById('addSurroundingBtn').addEventListener('click', addSurroundingRow);
    document.getElementById('setProposedLocationBtn').addEventListener('click', () => openMapModal({ type: 'proposed' }));
    table1Body.addEventListener('click', e => {
        if (e.target.classList.contains('map-btn')) {
            openMapModal({ type: 'surrounding', row: e.target.closest('tr') });
        }
    });

    addSurroundingRow(); // Add one initial surrounding row
    initializeOutputMap();
    runFullAnalysis(); // Initial analysis calculation and map rendering
});
