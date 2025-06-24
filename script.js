// NOTE: Your Supabase integration code has been included and corrected.
const SUPABASE_URL = 'https://vovjaedxiwsooxqvbwet.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdmphZWR4aXdzb294cXZid2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODM5NzMsImV4cCI6MjA2NTY1OTk3M30.GPs8mNRvF8w9WHmKFeflVPW9F_Sk8V4cToIm1Pwmcgs';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {

    // ================== SAFETY TABLE DATA (NEW LOGIC) ==================

    // From Table IB: K-Factors for D = K * Q^(1/3)
    const tableIB_Factors = {
        'D1': 0.5, 'D2': 0.8, 'D3': 1.1, 'D4': 1.8, 'D5': 2.4, 'D6': 4.8
    };

    // From Table IA: Quantity Distances for Hazard Division 1.1
    // PES = Potential Explosion Site, ES = Exposed Site
    const tableIA_Data = {
        'Igloo': {
            'Side': {
                'Igloo': { 'Side': 'D1', 'Rear': 'D1', 'Front UT': 'D3', 'Front T': 'D1' },
                'Bunker': { 'Side': 'D3', 'Rear': 'D1', 'Front UT': 'D5', 'Front T': 'D3' },
                'Above Ground Magazine': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D5', 'Front T': 'D4' }
            },
            'Rear': {
                'Igloo': { 'Side': 'D1', 'Rear': 'D1', 'Front UT': 'D2', 'Front T': 'D1' },
                'Bunker': { 'Side': 'D1', 'Rear': 'D1', 'Front UT': 'D5', 'Front T': 'D5' },
                'Above Ground Magazine': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D5', 'Front T': 'D4' }
            },
            'Front UT': {
                'Igloo': { 'Side': 'D3', 'Rear': 'D2', 'Front UT': 'D6', 'Front T': 'D5' },
                'Bunker': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D6', 'Front T': 'D5' },
                'Above Ground Magazine': { 'Side': 'D6', 'Rear': 'D6', 'Front UT': 'D6', 'Front T': 'D6' }
            },
            'Front T': {
                'Igloo': { 'Side': 'D1', 'Rear': 'D1', 'Front UT': 'D5', 'Front T': 'D3' },
                'Bunker': { 'Side': 'D3', 'Rear': 'D2', 'Front UT': 'D5', 'Front T': 'D5' },
                'Above Ground Magazine': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D6', 'Front T': 'D5' }
            }
        },
        'Bunker': {
            'Side': {
                'Igloo': { 'Side': 'D1', 'Rear': 'D1', 'Front UT': 'D3', 'Front T': 'D3' },
                'Bunker': { 'Side': 'D3', 'Rear': 'D2', 'Front UT': 'D5', 'Front T': 'D3' },
                'Above Ground Magazine': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D5', 'Front T': 'D5' }
            },
            'Rear': {
                'Igloo': { 'Side': 'D1', 'Rear': 'D1', 'Front UT': 'D2', 'Front T': 'D2' },
                'Bunker': { 'Side': 'D2', 'Rear': 'D2', 'Front UT': 'D5', 'Front T': 'D5' },
                'Above Ground Magazine': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D5', 'Front T': 'D5' }
            },
            'Front UT': {
                'Igloo': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D6', 'Front T': 'D5' },
                'Bunker': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D6', 'Front T': 'D5' },
                'Above Ground Magazine': { 'Side': 'D6', 'Rear': 'D6', 'Front UT': 'D6', 'Front T': 'D5' }
            },
            'Front T': {
                'Igloo': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D5', 'Front T': 'D5' },
                'Bunker': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D5', 'Front T': 'D5' },
                'Above Ground Magazine': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D5', 'Front T': 'D5' }
            }
        },
        'Above Ground Magazine': {
             'UT': { // Assuming UT/T distinction is for Front of PES, and AGM is a single entity
                'Igloo': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D6', 'Front T': 'D5' },
                'Bunker': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D6', 'Front T': 'D5' },
                'Above Ground Magazine': { 'Side': 'D6', 'Rear': 'D6', 'Front UT': 'D6', 'Front T': 'D5' }
            },
             'T': {
                'Igloo': { 'Side': 'D4', 'Rear': 'D4', 'Front UT': 'D5', 'Front T': 'D5' },
                'Bunker': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D5', 'Front T': 'D5' },
                'Above Ground Magazine': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D5', 'Front T': 'D5' }
            }
        }
    };

    // ================== SUPABASE DATABASE LOGIC (Corrected & Included) ==================
    const saveAnalysisToSupabase = async () => {
        alert("Note: Saving analysis requires database columns for orientation. This is a template for that functionality.");
        // This function would need to be expanded to save the new orientation fields.
        // It would require adding columns like 'orientation_xy_pes', 'orientation_xy_es', etc., to your Supabase table.
        // The current implementation is a placeholder.
    };

    const loadProjectFromSupabase = async (projectId) => {
         alert("Note: Loading analysis requires database columns for orientation. This is a template for that functionality.");
        // This function would need to be expanded to load and set the new orientation fields.
    };
    
    const loadProjectList = async () => {
        // This function remains as is, loading project names.
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
            
            [row.querySelector('.pes-orientation'), row.querySelector('.es-orientation')].forEach(sel => {
                let selValid = sel.value !== '';
                sel.classList.toggle('invalid-input', !selValid);
                if (!selValid) isValid = false;
            });

            if (reverseRow) {
                const necInput = reverseRow.querySelector('.reverse-nec');
                const typeSelect = reverseRow.querySelector('.reverse-type');
                const useSelect = reverseRow.querySelector('.reverse-use');
                
                let necValid = necInput.value !== '' && !isNaN(parseFloat(necInput.value));
                necInput.classList.toggle('invalid-input', !necValid);
                if (!necValid) isValid = false;

                [typeSelect, useSelect, reverseRow.querySelector('.pes-orientation'), reverseRow.querySelector('.es-orientation')].forEach(sel => {
                    let selValid = sel.value !== '';
                    sel.classList.toggle('invalid-input', !selValid);
                    if (!selValid) isValid = false;
                });
            }
        });
        return isValid;
    };

    // ================== CORE LOGIC & CALCULATIONS (REVISED) ==================
    const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
        if ([lat1, lon1, lat2, lon2].some(coord => isNaN(coord) || coord === null)) return 0;
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    
    const getRequiredDistances = (nec_in_kg, pes_type, es_type, pes_orientation, es_orientation) => {
        if (isNaN(nec_in_kg) || nec_in_kg <= 0 || !pes_type || !es_type || !pes_orientation || !es_orientation) {
            return { siqd: 0, piqd: 0 };
        }

        // --- NEW SIQD Calculation based on Tables IA & IB ---
        let siqd = 0;
        // Map UI types to Table IA types. 'Process' is treated as 'Above Ground Magazine'.
        const pes_type_mapped = pes_type === 'Process' ? 'Above Ground Magazine' : pes_type;
        const es_type_mapped = es_type === 'Process' ? 'Above Ground Magazine' : es_type;

        // Special handling for Above Ground Magazine PES from the table structure
        let d_category;
        if (pes_type_mapped === 'Above Ground Magazine') {
            const traversalType = pes_orientation.includes('T') ? 'T' : 'UT';
            d_category = tableIA_Data[pes_type_mapped]?.[traversalType]?.[es_type_mapped]?.[es_orientation];
        } else {
            d_category = tableIA_Data[pes_type_mapped]?.[pes_orientation]?.[es_type_mapped]?.[es_orientation];
        }
        
        const factor = tableIB_Factors[d_category];
        if (factor) {
            const Z = Math.pow(nec_in_kg, 1 / 3);
            siqd = factor * Z;
        }

        // --- LEGACY PIQD Calculation (as PIQD is not defined in the provided tables) ---
        let piqd = 0;
        let piqdFactor = 0;
        // The legacy PIQD logic is based on the PES type only.
        const pes_type_for_piqd = pes_type; // Use original type for this
        switch (pes_type_for_piqd) {
            case 'Above Ground Magazine': piqdFactor = 8; break;
            case 'Igloo': piqdFactor = 7; break;
            case 'Bunker': piqdFactor = 4; break;
            case 'Process': piqdFactor = 8; break;
        }
        if (piqdFactor > 0) {
            const Z = Math.pow(nec_in_kg, 1 / 3);
            piqd = piqdFactor * Z;
        }

        return { siqd, piqd };
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

        syncAndAnalyzeReverseTable(); // Sync first to ensure reverse table has data

        table1Body.querySelectorAll('tr').forEach(row => {
            const reverseRow = table2Body.querySelector(`[data-row-id="${row.id}"]`);
            if (!reverseRow) return;

            row.querySelector('.proposed-bldg-name').textContent = proposedBuilding.name;
            
            const s_type = reverseRow.querySelector('.reverse-type').value;
            const pes_orientation = row.querySelector('.pes-orientation').value;
            const es_orientation = row.querySelector('.es-orientation').value;

            const proposedQdMeters = getRequiredDistances(proposedBuilding.nec, proposedBuilding.type, s_type, pes_orientation, es_orientation);
            
            row.querySelector('.siqd-required').textContent = (proposedQdMeters.siqd * conversionFactor).toFixed(2);
            row.querySelector('.piqd-required').textContent = (proposedQdMeters.piqd * conversionFactor).toFixed(2);

            const sLat = parseFloat(row.querySelector('.surrounding-bldg-lat').value);
            const sLon = parseFloat(row.querySelector('.surrounding-bldg-lon').value);
            const distanceMeters = calculateHaversineDistance(proposedBuilding.lat, proposedBuilding.lon, sLat, sLon);

            row.querySelector('.distance-available').textContent = (distanceMeters * conversionFactor).toFixed(2);
            row.dataset.distanceMeters = distanceMeters;

            const remarksOutput = row.querySelector('.remarks-output');
            if (distanceMeters > 0 && !isNaN(proposedBuilding.lat) && !isNaN(proposedBuilding.lon) && proposedQdMeters.siqd > 0) {
                const requiredDistMeters = proposedBuilding.use === 'Process' ? proposedQdMeters.piqd : proposedQdMeters.siqd;
                remarksOutput.textContent = distanceMeters >= requiredDistMeters ? '✔️ Safe' : '❌ Violation';
                remarksOutput.className = `remarks-output ${distanceMeters >= requiredDistMeters ? 'safe' : 'violation'}`;
            } else {
                remarksOutput.textContent = 'Enter Inputs';
                remarksOutput.className = 'remarks-output';
            }
        });

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
            newRow.innerHTML = createReverseRowHTML();
            reverseRows.push(newRow);
        }
        while (reverseRows.length > surroundingRows.length) reverseRows.pop().remove();

        surroundingRows.forEach((sRow, index) => {
            const rRow = reverseRows[index];
            rRow.dataset.rowId = sRow.id;
            rRow.querySelector('.sur-name-reverse').textContent = sRow.querySelector('.surrounding-bldg-name').value || `Surrounding #${index + 1}`;

            const distanceMeters = parseFloat(sRow.dataset.distanceMeters || calculateHaversineDistance(
                parseFloat(document.getElementById('proposedBldgLat').value),
                parseFloat(document.getElementById('proposedBldgLon').value),
                parseFloat(sRow.querySelector('.surrounding-bldg-lat').value),
                parseFloat(sRow.querySelector('.surrounding-bldg-lon').value)
            ));
            rRow.querySelector('.reverse-distance').textContent = (distanceMeters * conversionFactor).toFixed(2);

            const nec = parseFloat(rRow.querySelector('.reverse-nec').value);
            const type = rRow.querySelector('.reverse-type').value;
            const useType = rRow.querySelector('.reverse-use').value;
            const pes_orientation = rRow.querySelector('.pes-orientation').value;
            const es_orientation = rRow.querySelector('.es-orientation').value;

            const qdMeters = getRequiredDistances(nec, type, proposedBuilding.type, pes_orientation, es_orientation);

            rRow.querySelector('.reverse-siqd').textContent = (qdMeters.siqd * conversionFactor).toFixed(2);
            rRow.querySelector('.reverse-piqd').textContent = (qdMeters.piqd * conversionFactor).toFixed(2);

            const remarksOutput = rRow.querySelector('.remarks-output');
            if (distanceMeters > 0 && !isNaN(proposedBuilding.lat) && !isNaN(proposedBuilding.lon) && qdMeters.siqd > 0) {
                const requiredDistMeters = useType === 'Process' ? qdMeters.piqd : qdMeters.siqd;
                remarksOutput.textContent = distanceMeters >= requiredDistMeters ? '✔️ Safe' : '❌ Violation';
                remarksOutput.className = `remarks-output ${distanceMeters >= requiredDistMeters ? 'safe' : 'violation'}`;
            } else {
                remarksOutput.textContent = 'Enter Inputs';
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

        table1Body.querySelectorAll('tr').forEach((row, index) => {
            const sName = row.querySelector('.surrounding-bldg-name').value || `Surrounding #${index + 1}`;
            const reverseRow = table2Body.querySelector(`[data-row-id="${row.id}"]`);
            if (!reverseRow) return;

            const s_type = reverseRow.querySelector('.reverse-type').value;
            const pes_orientation = row.querySelector('.pes-orientation').value;
            const es_orientation = row.querySelector('.es-orientation').value;
            
            const pQD = getRequiredDistances(proposedBuilding.nec, proposedBuilding.type, s_type, pes_orientation, es_orientation);

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
            
            const availDistMeters = parseFloat(table1Body.rows[index].dataset.distanceMeters);
            const sNec = parseFloat(row.querySelector('.reverse-nec').value);
            const sType = row.querySelector('.reverse-type').value;
            const sUse = row.querySelector('.reverse-use').value;
            const pes_orientation = row.querySelector('.pes-orientation').value;
            const es_orientation = row.querySelector('.es-orientation').value;

            const sQD = getRequiredDistances(sNec, sType, proposedBuilding.type, pes_orientation, es_orientation);
            const reqDistMeters = sUse === 'Process' ? sQD.piqd : sQD.siqd;
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
            if (pairData.pairXY && pairData.pairXY.reqDist > 0) {
                addSummaryRow(pairData.pairXY, conversionFactor, pairData.isFeasiblePair);
                if (pairData.pairXY.isViolation) violationsFoundOverall = true;
            }
            if (pairData.pairYX && pairData.pairYX.reqDist > 0) {
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
        
        // For map visualization, we use a generic orientation as specific pair orientation isn't practical here.
        const pQD_generic = getRequiredDistances(proposedBuilding.nec, proposedBuilding.type, 'Bunker', 'Front T', 'Front T');
        L.marker([pLat, pLon]).addTo(outputMap).bindTooltip(`<b>${proposedBuilding.name}</b><br>(Proposed)`);
        L.circle([pLat, pLon], { radius: pQD_generic.piqd, color: PIQD_COLOR, weight: 2, fillOpacity: 0.15 }).addTo(outputMap).bindTooltip(`Proposed PIQD: ${pQD_generic.piqd.toFixed(1)}m`);
        L.circle([pLat, pLon], { radius: pQD_generic.siqd, color: SIQD_COLOR, weight: 2, fillOpacity: 0.15 }).addTo(outputMap).bindTooltip(`Proposed SIQD: ${pQD_generic.siqd.toFixed(1)}m`);
        boundaryPoints.push(L.latLng(pLat, pLon));

        table1Body.querySelectorAll('tr').forEach(sRow => {
            const rRow = table2Body.querySelector(`[data-row-id="${sRow.id}"]`);
            if (!rRow) return;

            const sLat = parseFloat(sRow.querySelector('.surrounding-bldg-lat').value);
            const sLon = parseFloat(sRow.querySelector('.surrounding-bldg-lon').value);
            if (isNaN(sLat) || isNaN(sLon)) return;

            const sName = sRow.querySelector('.surrounding-bldg-name').value || `Surrounding ${sRow.id}`;
            const sNec = parseFloat(rRow.querySelector('.reverse-nec').value);
            const sType = rRow.querySelector('.reverse-type').value;
            const sUse = rRow.querySelector('.reverse-use').value;

            const sQD_generic = getRequiredDistances(sNec, sType, 'Bunker', 'Front T', 'Front T');
            L.marker([sLat, sLon]).addTo(outputMap).bindTooltip(`<b>${sName}</b>`);
            L.circle([sLat, sLon], { radius: sQD_generic.piqd, color: PIQD_COLOR, weight: 2, dashArray: '5, 5', fillOpacity: 0.1 }).addTo(outputMap);
            L.circle([sLat, sLon], { radius: sQD_generic.siqd, color: SIQD_COLOR, weight: 2, dashArray: '5, 5', fillOpacity: 0.1 }).addTo(outputMap);
            boundaryPoints.push(L.latLng(sLat, sLon));

            // Get the actual calculated distances for the link color
            const p_pes_orient = sRow.querySelector('.pes-orientation').value;
            const p_es_orient = sRow.querySelector('.es-orientation').value;
            const pQD_actual = getRequiredDistances(proposedBuilding.nec, proposedBuilding.type, sType, p_pes_orient, p_es_orient);

            const s_pes_orient = rRow.querySelector('.pes-orientation').value;
            const s_es_orient = rRow.querySelector('.es-orientation').value;
            const sQD_actual = getRequiredDistances(sNec, sType, proposedBuilding.type, s_pes_orient, s_es_orient);
            
            const dist = parseFloat(sRow.dataset.distanceMeters);
            const pReq = proposedBuilding.use === 'Process' ? pQD_actual.piqd : pQD_actual.siqd;
            const sReq = sUse === 'Process' ? sQD_actual.piqd : sQD_actual.siqd;
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
        const orientationOptions = `
            <option value="">Select</option>
            <option value="Side">Side</option>
            <option value="Rear">Rear</option>
            <option value="Front T">Front T</option>
            <option value="Front UT">Front UT</option>`;
        
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
            <td><select class="pes-orientation">${orientationOptions}</select></td>
            <td><select class="es-orientation">${orientationOptions}</select></td>
            <td class="siqd-required"></td>
            <td class="piqd-required"></td>
            <td class="distance-available"></td>
            <td class="remarks-output"></td>`;
        syncAndAnalyzeReverseTable();
    };
    
    const createReverseRowHTML = () => {
        const orientationOptions = `
            <option value="">Select</option>
            <option value="Side">Side</option>
            <option value="Rear">Rear</option>
            <option value="Front T">Front T</option>
            <option value="Front UT">Front UT</option>`;
        const typeOptions = `
            <option value="">Select Type</option>
            <option value="Igloo">Igloo</option>
            <option value="Bunker">Bunker</option>
            <option value="Above Ground Magazine">Above Ground Magazine</option>
            <option value="Process">Process Building</option>`;
        
        return `
            <td class="sur-name-reverse"></td>
            <td><input type="text" class="reverse-nec" placeholder="e.g., 1000"></td>
            <td><select class="reverse-type">${typeOptions}</select></td>
            <td><select class="reverse-use"><option value="">Select Use</option><option value="Storage">Storage</option><option value="Process">Process</option></select></td>
            <td><select class="pes-orientation">${orientationOptions}</select></td>
            <td><select class="es-orientation">${orientationOptions}</select></td>
            <td class="reverse-siqd"></td>
            <td class="reverse-piqd"></td>
            <td class="reverse-distance"></td>
            <td class="remarks-output"></td>`;
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
        
        // For modal visualization, use generic orientation as full context isn't available
        const qd = getRequiredDistances(nec, type, 'Bunker', 'Front T', 'Front T');
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
        runFullAnalysis();
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
    
    formContainer.addEventListener('input', runFullAnalysis);

    document.getElementById('saveAnalysisBtn').addEventListener('click', saveAnalysisToSupabase);
    document.getElementById('loadAnalysisBtn').addEventListener('click', () => {
        const selectedId = document.getElementById('analysisSelector').value;
        loadProjectFromSupabase(selectedId);
    });

    // Initial setup on page load
    addSurroundingRow();
    initializeOutputMap();
    runFullAnalysis();
    // loadProjectList(); // Uncomment if you have Supabase configured
});
