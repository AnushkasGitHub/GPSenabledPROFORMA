// NOTE: Your Supabase integration code has been included and corrected.
const SUPABASE_URL = 'https://vovjaedxiwsooxqvbwet.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdmphZWR4aXdzb294cXZid2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODM5NzMsImV4cCI6MjA2NTY1OTk3M30.GPs8mNRvF8w9WHmKFeflVPW9F_Sk8V4cToIm1Pwmcgs';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {

    // ================== SUPABASE DATABASE LOGIC (Corrected & Included) ==================
    const saveAnalysisToSupabase = async () => {
        const projectName = prompt("Please enter a name for this analysis:");
        if (!projectName) {
            alert("Save cancelled. A project name is required.");
            return;
        }

        const { data: projectData, error: projectError } = await supabaseClient
            .from('siting_projects')
            .insert({ project_name: projectName })
            .select()
            .single();

        if (projectError) {
            console.error('Error creating project:', projectError);
            alert(`Failed to save project: ${projectError.message}`);
            return;
        }

        const projectId = projectData.id;
        const buildingsToSave = [];

        // Add proposed building
        buildingsToSave.push({
            project_id: projectId,
            is_proposed: true,
            name: document.getElementById('proposedBldgName').value,
            building_type: document.getElementById('buildingType').value,
            latitude: parseFloat(document.getElementById('proposedBldgLat').value),
            longitude: parseFloat(document.getElementById('proposedBldgLon').value),
            nec: parseFloat(document.getElementById('proposedBldgNec').value),
            use_type: document.getElementById('buildingUse').value,
            hazard_division: document.getElementById('proposedBldgHazardDiv').value,
            traversed_type: document.getElementById('traversedType').value
        });

        // Add surrounding buildings
        document.querySelectorAll('#proposedToSurroundingTable-body tr').forEach(row => {
            const rowId = row.id;
            const reverseRow = document.querySelector(`#surroundingToProposedTable-body [data-row-id="${rowId}"]`);
            if (reverseRow) {
                buildingsToSave.push({
                    project_id: projectId,
                    is_proposed: false,
                    name: row.querySelector('.surrounding-bldg-name').value,
                    latitude: parseFloat(row.querySelector('.surrounding-bldg-lat').value),
                    longitude: parseFloat(row.querySelector('.surrounding-bldg-lon').value),
                    nec: parseFloat(reverseRow.querySelector('.reverse-nec').value),
                    building_type: reverseRow.querySelector('.reverse-type').value,
                    use_type: reverseRow.querySelector('.reverse-use').value,
                    hazard_division: reverseRow.querySelector('.reverse-hazard').value,
                });
            }
        });

        const { error: buildingsError } = await supabaseClient.from('buildings').insert(buildingsToSave);

        if (buildingsError) {
            console.error('Error saving buildings:', buildingsError);
            alert(`Failed to save building details: ${buildingsError.message}`);
        } else {
            alert(`Analysis "${projectName}" saved successfully!`);
            loadProjectList(); // Refresh the list
        }
    };

    const loadProjectList = async () => {
        const selector = document.getElementById('analysisSelector');
        selector.innerHTML = '<option>Loading...</option>';
        const { data, error } = await supabaseClient
            .from('siting_projects')
            .select('id, project_name')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading projects:', error);
            selector.innerHTML = '<option>Error loading projects</option>';
            return;
        }

        selector.innerHTML = '<option value="">Select an Analysis to Load</option>';
        data.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.project_name;
            selector.appendChild(option);
        });
    };

    const loadProjectFromSupabase = async (projectId) => {
        if (!projectId) return;

        const { data: buildings, error } = await supabaseClient
            .from('buildings')
            .select('*')
            .eq('project_id', projectId);

        if (error) {
            alert(`Error loading analysis: ${error.message}`);
            return;
        }

        table1Body.innerHTML = '';
        table2Body.innerHTML = '';

        const proposed = buildings.find(b => b.is_proposed);
        const surrounding = buildings.filter(b => !b.is_proposed);

        if (proposed) {
            document.getElementById('proposedBldgName').value = proposed.name || '';
            document.getElementById('buildingType').value = proposed.building_type || '';
            document.getElementById('proposedBldgLat').value = proposed.latitude || '';
            document.getElementById('proposedBldgLon').value = proposed.longitude || '';
            document.getElementById('proposedBldgNec').value = proposed.nec || '';
            document.getElementById('buildingUse').value = proposed.use_type || '';
            document.getElementById('proposedBldgHazardDiv').value = proposed.hazard_division || '';
            document.getElementById('traversedType').value = proposed.traversed_type || 'Non-traversed';
        }

        surrounding.forEach(s_bldg => {
            addSurroundingRow();
            const newRowT1 = table1Body.lastChild;
            const newRowT2 = table2Body.lastChild;

            if(newRowT1 && newRowT2) {
                newRowT1.querySelector('.surrounding-bldg-name').value = s_bldg.name || '';
                newRowT1.querySelector('.surrounding-bldg-lat').value = s_bldg.latitude || '';
                newRowT1.querySelector('.surrounding-bldg-lon').value = s_bldg.longitude || '';

                newRowT2.querySelector('.reverse-nec').value = s_bldg.nec || '';
                newRowT2.querySelector('.reverse-type').value = s_bldg.building_type || '';
                newRowT2.querySelector('.reverse-use').value = s_bldg.use_type || '';
                newRowT2.querySelector('.reverse-hazard').value = s_bldg.hazard_division || '';
            }
        });

        runFullAnalysis();
        alert('Analysis loaded successfully.');
    };

    // ================== CONFIGURATION & STATE ==================
    const METER_TO_FEET = 3.28084;
    let modalMap, outputMap, activeMapContext, selectionMarker;
    let selectionSiqdCircle, selectionPiqdCircle;
    let proposedBuilding = { name: '', nec: 0, type: '', use: '', lat: null, lon: null };

    const PIQD_COLOR = '#007bff';
    const SIQD_COLOR = '#ffc107';

    // ================== ELEMENT SELECTORS ==================
    const modal = document.getElementById('mapModal');
    const formContainer = document.querySelector('body');
    const table1Body = document.getElementById('proposedToSurroundingTable-body');
    const table2Body = document.getElementById('surroundingToProposedTable-body');
    const violationSummaryBody = document.getElementById('violationSummaryTable-body');
    const mapOutputSection = document.getElementById('mapOutputSection');
    const unitSelector = document.getElementById('unitSelector');
    const violationSummarySection = document.getElementById('violationSummarySection');
    const warningTitle = violationSummarySection.querySelector('.warning-title');

    // ================== INITIALIZATION ==================
    const initializeOutputMap = () => {
        if (!outputMap) {
            outputMap = L.map('outputMap').setView([28.6139, 77.2090], 5);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(outputMap);

            const legend = L.control({ position: 'bottomright' });
            legend.onAdd = function(map) {
                const div = L.DomUtil.create('div', 'leaflet-control-legend');
                div.innerHTML =
                    '<h4>Map Legend</h4>' +
                    `<i style="border-color: ${PIQD_COLOR};"></i> Proposed PIQD<br>` +
                    `<i style="border-color: ${SIQD_COLOR};"></i> Proposed SIQD<br>` +
                    `<i style="border-color: ${PIQD_COLOR};" class="dashed"></i> Surrounding PIQD<br>` +
                    `<i style="border-color: ${SIQD_COLOR};" class="dashed"></i> Surrounding SIQD<br>` +
                    '<hr style="margin: 4px 0; border-color: #ccc;">' +
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
        const fieldsToValidate = ['proposedBldgNec', 'proposedBldgLat', 'proposedBldgLon'];
        fieldsToValidate.forEach(id => {
            const field = document.getElementById(id);
            let fieldValid = field.value !== '' && !isNaN(parseFloat(field.value));
            field.classList.toggle('invalid-input', !fieldValid);
            if (!fieldValid) isValid = false;
        });

        const selectFieldsToValidate = ['buildingType', 'buildingUse'];
        selectFieldsToValidate.forEach(id => {
            const field = document.getElementById(id);
            let fieldValid = field.value !== '';
            field.classList.toggle('invalid-input', !fieldValid);
            if (!fieldValid) isValid = false;
        });

        table1Body.querySelectorAll('tr').forEach(row => {
            const reverseRow = table2Body.querySelector(`[data-row-id="${row.id}"]`);
            const latInput = row.querySelector('.surrounding-bldg-lat');
            const lonInput = row.querySelector('.surrounding-bldg-lon');

            [latInput, lonInput].forEach(input => {
                let inputValid = input.value !== '' && !isNaN(parseFloat(input.value));
                input.classList.toggle('invalid-input', !inputValid);
                if (!inputValid) isValid = false;
            });

            if (reverseRow) {
                const necInput = reverseRow.querySelector('.reverse-nec');
                const typeSelect = reverseRow.querySelector('.reverse-type');
                const useSelect = reverseRow.querySelector('.reverse-use');
                
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
        const a = Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
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
        proposedBuilding.name = document.getElementById('proposedBldgName').value || 'Proposed Bldg (X)';
        proposedBuilding.lat = parseFloat(document.getElementById('proposedBldgLat').value);
        proposedBuilding.lon = parseFloat(document.getElementById('proposedBldgLon').value);
        proposedBuilding.nec = parseFloat(document.getElementById('proposedBldgNec').value);
        proposedBuilding.type = document.getElementById('buildingType').value;
        proposedBuilding.use = document.getElementById('buildingUse').value;

        if (isNaN(proposedBuilding.lat) || isNaN(proposedBuilding.lon)) {
            mapOutputSection.style.display = 'none';
        }

        if (!validateAndHighlight()) {
            mapOutputSection.style.display = 'none';
            violationSummarySection.style.display = 'none';
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
            if (distanceMeters > 0 && !isNaN(proposedBuilding.lat) && !isNaN(proposedBuilding.lon)) {
                const requiredDistMeters = proposedBuilding.use === 'Process' ? proposedQdMeters.piqd : proposedQdMeters.siqd;
                remarksOutput.textContent = distanceMeters >= requiredDistMeters ? '✔️ Safe' : '❌ Violation';
                remarksOutput.className = `remarks-output ${distanceMeters >= requiredDistMeters ? 'safe' : 'violation'}`;
            } else {
                remarksOutput.textContent = 'Enter All Coordinates';
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
            rRow.dataset.rowId = sRow.id;
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
            if (distanceMeters > 0 && !isNaN(proposedBuilding.lat) && !isNaN(proposedBuilding.lon)) {
                const requiredDistMeters = useType === 'Process' ? qdMeters.piqd : qdMeters.siqd;
                remarksOutput.textContent = distanceMeters >= requiredDistMeters ? '✔️ Safe' : '❌ Violation';
                remarksOutput.className = `remarks-output ${distanceMeters >= requiredDistMeters ? 'safe' : 'violation'}`;
            } else {
                remarksOutput.textContent = 'Enter All Coordinates';
                remarksOutput.className = 'remarks-output';
            }
        });
    };

    const updateViolationSummary = () => {
        violationSummaryBody.innerHTML = '';
        const selectedUnit = unitSelector.value;
        const conversionFactor = selectedUnit === 'ft' ? METER_TO_FEET : 1;
        let violationsFoundOverall = false;
        const allSummaryPairs = {};

        const pQD = calculateQdInMeters(proposedBuilding.nec, proposedBuilding.type);

        table1Body.querySelectorAll('tr').forEach((row, index) => {
            const sName = row.querySelector('.surrounding-bldg-name').value || `Surrounding #${index + 1}`;
            const sLat = parseFloat(row.querySelector('.surrounding-bldg-lat').value);
            const sLon = parseFloat(row.querySelector('.surrounding-bldg-lon').value);

            if (isNaN(proposedBuilding.lat) || isNaN(proposedBuilding.lon) || isNaN(sLat) || isNaN(sLon)) return;

            const availDistMeters = parseFloat(row.dataset.distanceMeters);
            const reqDistMeters = proposedBuilding.use === 'Process' ? pQD.piqd : pQD.siqd;
            const shortfall = reqDistMeters > 0 ? ((availDistMeters - reqDistMeters) / reqDistMeters) * 100 : 0;
            const isViolation = shortfall < 0;

            if (!allSummaryPairs[sName]) {
                allSummaryPairs[sName] = { pairXY: null, pairYX: null, isFeasiblePair: true };
            }
            allSummaryPairs[sName].pairXY = {
                pairLabel: `${proposedBuilding.name} → ${sName}`,
                reqDist: reqDistMeters, availDist: availDistMeters, shortfall, isViolation,
            };
            if (isViolation) allSummaryPairs[sName].isFeasiblePair = false;
        });

        table2Body.querySelectorAll('tr').forEach((row, index) => {
            const sName = row.querySelector('.sur-name-reverse').textContent;
            const sLat = parseFloat(table1Body.rows[index].querySelector('.surrounding-bldg-lat').value);
            const sLon = parseFloat(table1Body.rows[index].querySelector('.surrounding-bldg-lon').value);

            if (isNaN(proposedBuilding.lat) || isNaN(proposedBuilding.lon) || isNaN(sLat) || isNaN(sLon)) return;

            const availDistMeters = parseFloat(table1Body.rows[index].dataset.distanceMeters);
            const sQD = calculateQdInMeters(parseFloat(row.querySelector('.reverse-nec').value), row.querySelector('.reverse-type').value);
            const reqDistMeters = row.querySelector('.reverse-use').value === 'Process' ? sQD.piqd : sQD.siqd;
            const shortfall = reqDistMeters > 0 ? ((availDistMeters - reqDistMeters) / reqDistMeters) * 100 : 0;
            const isViolation = shortfall < 0;

            if (!allSummaryPairs[sName]) {
                allSummaryPairs[sName] = { pairXY: null, pairYX: null, isFeasiblePair: true };
            }
            allSummaryPairs[sName].pairYX = {
                pairLabel: `${sName} → ${proposedBuilding.name}`,
                reqDist: reqDistMeters, availDist: availDistMeters, shortfall, isViolation,
            };
            if (isViolation) allSummaryPairs[sName].isFeasiblePair = false;
        });

        const sortedPairKeys = Object.keys(allSummaryPairs).sort();

        sortedPairKeys.forEach(key => {
            const pairData = allSummaryPairs[key];
            if (pairData.pairXY) {
                addSummaryRow(pairData.pairXY, conversionFactor, pairData.isFeasiblePair);
                if (pairData.pairXY.isViolation) violationsFoundOverall = true;
            }
            if (pairData.pairYX) {
                addSummaryRow(pairData.pairYX, conversionFactor, pairData.isFeasiblePair);
                if (pairData.pairYX.isViolation) violationsFoundOverall = true;
            }
        });

        violationSummarySection.style.display = sortedPairKeys.length > 0 ? 'block' : 'none';
        warningTitle.style.display = violationsFoundOverall ? 'block' : 'none';
    };

    const addSummaryRow = (data, factor, isFeasiblePair) => {
        let remarks = "";
        if (data.isViolation) {
            remarks = "Review layout or NEC.";
            if (data.shortfall >= -30 && data.shortfall < -10) remarks = "Reduce NEC or relocate.";
            else if (data.shortfall < -30) remarks = "Consider Bunker or major redesign.";
        } else {
            remarks = "Distance requirement met.";
        }

        const rowClass = isFeasiblePair ? 'row-group-safe' : 'row-group-violation';
        const row = `
            <tr class="${rowClass}">
                <td>${data.pairLabel}</td>
                <td>${(data.reqDist * factor).toFixed(2)}</td>
                <td>${(data.availDist * factor).toFixed(2)}</td>
                <td class="${data.isViolation ? 'shortfall-cell' : ''}">${data.isViolation ? data.shortfall.toFixed(1) + '%' : 'N/A'}</td>
                <td class="remarks-output ${data.isViolation ? 'violation' : 'safe'}">${data.isViolation ? '❌ Violation' : '✔️ Safe'}</td>
                <td>${remarks}</td>
            </tr>`;
        violationSummaryBody.insertAdjacentHTML('beforeend', row);
    };

    const renderOutputMap = () => {
        if (!outputMap) initializeOutputMap();
        outputMap.eachLayer(layer => {
            if (layer instanceof L.TileLayer === false && !layer.options.isLegend) {
                outputMap.removeLayer(layer);
            }
        });

        const pLat = proposedBuilding.lat, pLon = proposedBuilding.lon;
        const boundaryPoints = [];
        let allCoordinatesValidForMap = !isNaN(pLat) && !isNaN(pLon);

        table1Body.querySelectorAll('tr').forEach(row => {
            if (isNaN(parseFloat(row.querySelector('.surrounding-bldg-lat').value)) || isNaN(parseFloat(row.querySelector('.surrounding-bldg-lon').value))) {
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
        L.marker([pLat, pLon]).addTo(outputMap).bindTooltip(`<b>${proposedBuilding.name}</b><br>(Proposed)`);
        L.circle([pLat, pLon], { radius: pQD.piqd, color: PIQD_COLOR, weight: 2, fillOpacity: 0.15 }).addTo(outputMap).bindTooltip(`Proposed PIQD: ${pQD.piqd.toFixed(1)}m`);
        L.circle([pLat, pLon], { radius: pQD.siqd, color: SIQD_COLOR, weight: 2, fillOpacity: 0.15 }).addTo(outputMap).bindTooltip(`Proposed SIQD: ${pQD.siqd.toFixed(1)}m`);
        boundaryPoints.push(L.latLng(pLat, pLon));

        table1Body.querySelectorAll('tr').forEach(sRow => {
            const sLat = parseFloat(sRow.querySelector('.surrounding-bldg-lat').value);
            const sLon = parseFloat(sRow.querySelector('.surrounding-bldg-lon').value);
            const rRow = table2Body.querySelector(`[data-row-id="${sRow.id}"]`);

            if (isNaN(sLat) || isNaN(sLon) || !rRow) return;

            const sName = sRow.querySelector('.surrounding-bldg-name').value || `Surrounding ${sRow.id}`;
            const sNec = parseFloat(rRow.querySelector('.reverse-nec').value);
            const sType = rRow.querySelector('.reverse-type').value;
            const sUse = rRow.querySelector('.reverse-use').value;
            const sQD = calculateQdInMeters(sNec, sType);

            L.marker([sLat, sLon]).addTo(outputMap).bindTooltip(`<b>${sName}</b>`);
            L.circle([sLat, sLon], { radius: sQD.piqd, color: PIQD_COLOR, weight: 2, dashArray: '5, 5', fillOpacity: 0.1 }).addTo(outputMap);
            L.circle([sLat, sLon], { radius: sQD.siqd, color: SIQD_COLOR, weight: 2, dashArray: '5, 5', fillOpacity: 0.1 }).addTo(outputMap);
            boundaryPoints.push(L.latLng(sLat, sLon));

            const dist = parseFloat(sRow.dataset.distanceMeters);
            const pReq = proposedBuilding.use === 'Process' ? pQD.piqd : pQD.siqd;
            const sReq = sUse === 'Process' ? sQD.piqd : sQD.siqd;
            const isOverallViolation = (dist < pReq) || (dist < sReq);

            const lineColor = isOverallViolation ? 'red' : 'green';
            const lineStyle = { color: lineColor, weight: 3, dashArray: isOverallViolation ? '5, 5' : '' };

            L.polyline([[pLat, pLon], [sLat, sLon]], lineStyle).addTo(outputMap).bindTooltip(
                `<b>${proposedBuilding.name} ↔ ${sName}</b><br>` +
                `Status: <b style="color:${lineColor};">${isOverallViolation ? 'NOT FEASIBLE' : 'FEASIBLE'}</b>`
            );
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

    // ================== MAP MODAL LOGIC (Corrected & Completed) ==================
    const drawContextOnModalMap = (mapInstance) => {
        mapInstance.eachLayer(layer => {
            if (!(layer instanceof L.TileLayer)) mapInstance.removeLayer(layer);
        });
        const boundaryPoints = [];

        if (!isNaN(proposedBuilding.lat) && !isNaN(proposedBuilding.lon)) {
            L.marker([proposedBuilding.lat, proposedBuilding.lon]).addTo(mapInstance).bindTooltip(proposedBuilding.name || 'Proposed Building');
            boundaryPoints.push(L.latLng(proposedBuilding.lat, proposedBuilding.lon));
        }

        table1Body.querySelectorAll('tr').forEach((sRow) => {
            const sLat = parseFloat(sRow.querySelector('.surrounding-bldg-lat').value);
            const sLon = parseFloat(sRow.querySelector('.surrounding-bldg-lon').value);
            if (!isNaN(sLat) && !isNaN(sLon)) {
                 const sName = sRow.querySelector('.surrounding-bldg-name').value || `Surrounding`;
                 L.marker([sLat, sLon]).addTo(mapInstance).bindTooltip(sName);
                 boundaryPoints.push(L.latLng(sLat, sLon));
            }
        });

        if (boundaryPoints.length > 0) {
            mapInstance.fitBounds(L.latLngBounds(boundaryPoints).pad(0.3));
        } else {
            mapInstance.setView([28.6139, 77.2090], 10);
        }
    };

    const handleMapClick = (e) => {
        const latlng = e.latlng;
        if (selectionMarker) {
            selectionMarker.setLatLng(latlng);
        } else {
            selectionMarker = L.marker(latlng, { draggable: true, zIndexOffset: 1000 }).addTo(modalMap);
            selectionMarker.on('dragend', (event) => handleMapClick({ latlng: event.target.getLatLng() }));
        }

        if (selectionSiqdCircle) modalMap.removeLayer(selectionSiqdCircle);
        if (selectionPiqdCircle) modalMap.removeLayer(selectionPiqdCircle);

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

        const qd = calculateQdInMeters(nec, type);
        if (qd.siqd > 0) {
            selectionPiqdCircle = L.circle(latlng, { radius: qd.piqd, color: PIQD_COLOR, weight: 2, dashArray: '5, 5', fillOpacity: 0.2, interactive: false }).addTo(modalMap);
            selectionSiqdCircle = L.circle(latlng, { radius: qd.siqd, color: SIQD_COLOR, weight: 2, dashArray: '5, 5', fillOpacity: 0.2, interactive: false }).addTo(modalMap);
        }
    };

    const openMapModal = (context) => {
        activeMapContext = context;
        modal.style.display = 'block';

        setTimeout(() => {
            if (!modalMap) {
                modalMap = L.map('map').setView([28.6139, 77.2090], 10);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(modalMap);
            }
            modalMap.invalidateSize();
            drawContextOnModalMap(modalMap);

            let initialLat, initialLon;
            if (context.type === 'proposed') {
                initialLat = parseFloat(document.getElementById('proposedBldgLat').value);
                initialLon = parseFloat(document.getElementById('proposedBldgLon').value);
            } else {
                initialLat = parseFloat(context.row.querySelector('.surrounding-bldg-lat').value);
                initialLon = parseFloat(context.row.querySelector('.surrounding-bldg-lon').value);
            }

            if (!isNaN(initialLat) && !isNaN(initialLon)) {
                handleMapClick({ latlng: L.latLng(initialLat, initialLon) });
                 modalMap.setView([initialLat, initialLon], 15);
            }

            modalMap.on('click', handleMapClick);
        }, 10);
    };

    const closeModalAndCleanup = () => {
        if (selectionMarker) modalMap.removeLayer(selectionMarker);
        if (selectionSiqdCircle) modalMap.removeLayer(selectionSiqdCircle);
        if (selectionPiqdCircle) modalMap.removeLayer(selectionPiqdCircle);
        selectionMarker = selectionSiqdCircle = selectionPiqdCircle = null;
        modalMap.off('click', handleMapClick);
        modal.style.display = 'none';
    };

    // ================== EVENT HANDLERS & INITIALIZATION ==================
    // This is the section that was missing from your code.
    
    document.getElementById('confirmLocationBtn').addEventListener('click', () => {
        if (!selectionMarker) {
            alert("Please click on the map to select a location.");
            return;
        }
        const latlng = selectionMarker.getLatLng();

        if (activeMapContext.type === 'proposed') {
            document.getElementById('proposedBldgLat').value = latlng.lat.toFixed(6);
            document.getElementById('proposedBldgLon').value = latlng.lng.toFixed(6);
        } else {
            activeMapContext.row.querySelector('.surrounding-bldg-lat').value = latlng.lat.toFixed(6);
            activeMapContext.row.querySelector('.surrounding-bldg-lon').value = latlng.lng.toFixed(6);
        }
        closeModalAndCleanup();
        runFullAnalysis(); // Re-run analysis with new coordinates
    });

    document.getElementById('cancelModalBtn').addEventListener('click', closeModalAndCleanup);

    document.getElementById('setProposedLocationBtn').addEventListener('click', () => {
        openMapModal({ type: 'proposed' });
    });

    table1Body.addEventListener('click', e => {
        if (e.target.classList.contains('map-btn')) {
            openMapModal({ type: 'surrounding', row: e.target.closest('tr') });
        }
    });

    document.getElementById('addSurroundingBtn').addEventListener('click', addSurroundingRow);
    
    // Listen for any input change on the form to re-run the analysis
    formContainer.addEventListener('input', runFullAnalysis);

    // Supabase Save/Load Listeners
    document.getElementById('saveAnalysisBtn').addEventListener('click', saveAnalysisToSupabase);
    document.getElementById('loadAnalysisBtn').addEventListener('click', () => {
        const selectedId = document.getElementById('analysisSelector').value;
        loadProjectFromSupabase(selectedId);
    });

    // Initial setup on page load
    addSurroundingRow();
    initializeOutputMap();
    runFullAnalysis();
    loadProjectList(); // Populate Supabase project list on load
});
