    // NOTE: Your Supabase integration code has been included and corrected.
    const SUPABASE_URL = 'https://vovjaedxiwsooxqvbwet.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvdmphZWR4aXdzb294cXZid2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwODM5NzMsImV4cCI6MjA2NTY1OTk3M30.GPs8mNRvF8w9WHmKFeflVPW9F_Sk8V4cToIm1Pwmcgs';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    document.addEventListener('DOMContentLoaded', () => {

        // ================== SAFETY TABLE DATA (CORE CONFIG) ==================

        // K-Factors for SIQD calculation based on D-Category from STEC/DRDO rules.
        // Formula: D = K * Q^(1/3)
        const tableIB_Factors = {
            'D1': 0.5, 'D2': 0.8, 'D3': 1.1, 'D4': 1.8, 'D5': 2.4, 'D6': 4.8
        };

        // Defines the required D-Category for SIQD between two buildings (Potential Explosion Site and Exposed Site).
        // Structure: tableIA_Data[PES_Type][PES_Orientation][ES_Type][ES_Orientation] = D-Category
        let tableIA_Data = {
            'Igloo': {
                'Side': { 'Igloo': { 'Side': 'D1', 'Rear': 'D1', 'Front UT': 'D3', 'Front T': 'D1' }, 'Bunker': { 'Side': 'D3', 'Rear': 'D1', 'Front UT': 'D5', 'Front T': 'D3' }, 'Above Ground Magazine': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D5', 'Front T': 'D4' }},
                'Rear': { 'Igloo': { 'Side': 'D1', 'Rear': 'D1', 'Front UT': 'D2', 'Front T': 'D1' }, 'Bunker': { 'Side': 'D1', 'Rear': 'D1', 'Front UT': 'D5', 'Front T': 'D5' }, 'Above Ground Magazine': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D5', 'Front T': 'D4' }},
                'Front UT': { 'Igloo': { 'Side': 'D3', 'Rear': 'D2', 'Front UT': 'D6', 'Front T': 'D5' }, 'Bunker': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D6', 'Front T': 'D5' }, 'Above Ground Magazine': { 'Side': 'D6', 'Rear': 'D6', 'Front UT': 'D6', 'Front T': 'D6' }},
                'Front T': { 'Igloo': { 'Side': 'D1', 'Rear': 'D1', 'Front UT': 'D5', 'Front T': 'D3' }, 'Bunker': { 'Side': 'D3', 'Rear': 'D2', 'Front UT': 'D5', 'Front T': 'D5' }, 'Above Ground Magazine': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D6', 'Front T': 'D5' }}
            },
            'Bunker': {
                'Side': { 'Igloo': { 'Side': 'D1', 'Rear': 'D1', 'Front UT': 'D3', 'Front T': 'D3' }, 'Bunker': { 'Side': 'D3', 'Rear': 'D2', 'Front UT': 'D5', 'Front T': 'D3' }, 'Above Ground Magazine': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D5', 'Front T': 'D5' }},
                'Rear': { 'Igloo': { 'Side': 'D1', 'Rear': 'D1', 'Front UT': 'D2', 'Front T': 'D2' }, 'Bunker': { 'Side': 'D2', 'Rear': 'D2', 'Front UT': 'D5', 'Front T': 'D5' }, 'Above Ground Magazine': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D5', 'Front T': 'D5' }},
                'Front UT': { 'Igloo': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D6', 'Front T': 'D5' }, 'Bunker': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D6', 'Front T': 'D5' }, 'Above Ground Magazine': { 'Side': 'D6', 'Rear': 'D6', 'Front UT': 'D6', 'Front T': 'D5' }},
                'Front T': { 'Igloo': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D5', 'Front T': 'D5' }, 'Bunker': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D5', 'Front T': 'D5' }, 'Above Ground Magazine': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D5', 'Front T': 'D5' }}
            },
            'Above Ground Magazine': {
                'UT': { 'Igloo': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D6', 'Front T': 'D5' }, 'Bunker': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D6', 'Front T': 'D5' }, 'Above Ground Magazine': { 'Side': 'D6', 'Rear': 'D6', 'Front UT': 'D6', 'Front T': 'D5' }},
                'T': { 'Igloo': { 'Side': 'D4', 'Rear': 'D4', 'Front UT': 'D5', 'Front T': 'D5' }, 'Bunker': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D5', 'Front T': 'D5' }, 'Above Ground Magazine': { 'Side': 'D5', 'Rear': 'D5', 'Front UT': 'D5', 'Front T': 'D5' }}
            }
        };
        
        // Static list of available building types.
        let buildingTypes = ['Igloo', 'Bunker', 'Above Ground Magazine', 'Underground Bunker'];
        
        // K-Factors for PIQD calculation. Formula: D = K * Q^(1/3)
        let piqdFactors = {
            'Igloo': 7,
            'Bunker': 4,
            'Above Ground Magazine': 8,
            'Process': 8, // Process buildings are treated like AGMs for PIQD
            'Underground Bunker': 6
        };

        // ================== SUPABASE DATABASE LOGIC (PLACEHOLDER) ==================
        const saveAnalysisToSupabase = async () => { alert("Database save functionality placeholder."); };
        const loadProjectFromSupabase = async (projectId) => { alert("Database load functionality placeholder."); };
        const loadProjectList = async () => { /* Placeholder */ };


        // ================== GLOBAL CONFIGURATION & STATE ==================
        const METER_TO_FEET = 3.28084;
        let modalMap, outputMap, activeMapContext, selectionMarker;
        let selectionSiqdCircle, selectionPiqdCircle;
        let proposedBuilding = { name: '', nec: 0, type: '', use: '', lat: null, lon: null };

        // Color constants for map visualization
        const PIQD_COLOR = '#007bff';
        const SIQD_COLOR = '#ffc107';

        // ================== DOM ELEMENT SELECTORS ==================
        const mapModal = document.getElementById('mapModal');
        const formContainer = document.querySelector('body');
        const table1Body = document.getElementById('proposedToSurroundingTable-body');
        const table2Body = document.getElementById('surroundingToProposedTable-body');
        const violationSummaryBody = document.getElementById('violationSummaryTable-body');
        const mapOutputSection = document.getElementById('mapOutputSection');
        const unitSelector = document.getElementById('unitSelector');
        const violationSummarySection = document.getElementById('violationSummarySection');
        const warningTitle = violationSummarySection.querySelector('.warning-title');

        // ================== MAP INITIALIZATION ==================
        /**
         * Creates and configures the main output map if it doesn't already exist.
         * Includes a legend for interpreting the map symbols.
         */
        const initializeOutputMap = () => {
            if (!outputMap) {
                outputMap = L.map('outputMap').setView([28.6139, 77.2090], 5);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(outputMap);
                const legend = L.control({ position: 'bottomright' });
                legend.onAdd = function(map) {
                    const div = L.DomUtil.create('div', 'leaflet-control-legend');
                    div.innerHTML = '<h4>Map Legend</h4>' + `<i style="border-color: ${PIQD_COLOR};"></i> Proposed PIQD<br>` + `<i style="border-color: ${SIQD_COLOR};"></i> Proposed SIQD<br>` + `<i style="border-color: ${PIQD_COLOR};" class="dashed"></i> Surrounding PIQD<br>` + `<i style="border-color: ${SIQD_COLOR};" class="dashed"></i> Surrounding SIQD<br>` + '<hr style="margin: 4px 0; border-color: #ccc;">' + '<i style="background-color: green;" class="line"></i> Feasible Link<br>' + '<i style="border-color: red;" class="line dashed"></i> Violation Link';
                    return div;
                };
                legend.addTo(outputMap);
            }
        };

        // ================== INPUT VALIDATION ==================

        /**
         * Displays or clears a visible error message next to an input field.
         * @param {HTMLElement} inputElement - The input field to associate the error with.
         * @param {string | null} message - The error message to display. If empty/null, the error is cleared.
         */
        const toggleError = (inputElement, message) => {
            const container = inputElement.parentElement;
            let errorElement = container.querySelector('.error-message');

            if (message) {
                // If an error message should be displayed, create/update it.
                if (!errorElement) {
                    errorElement = document.createElement('small');
                    errorElement.className = 'error-message';
                    container.appendChild(errorElement);
                }
                errorElement.textContent = message;
                inputElement.classList.add('invalid-input');
            } else if (errorElement) {
                // If the message is empty and an error element exists, remove it.
                errorElement.remove();
                inputElement.classList.remove('invalid-input');
            }
        };

        /**
         * Validates all required input fields in the form.
         * Highlights invalid fields and enforces the 200kg NEC limit for Underground Bunkers.
         * @returns {boolean} - True if all inputs are valid, false otherwise.
         */
        const validateAndHighlight = () => {
            let overallIsValid = true;

            // Helper function to check if a field has a value
            const checkRequired = (field, message = "This field is required.") => {
                if (field.value === '' || field.value === null) {
                    toggleError(field, message);
                    overallIsValid = false;
                    return false;
                }
                toggleError(field, null); // Clear previous errors
                return true;
            };

            // Helper function to check if a field is a valid number
            const checkNumber = (field, message = "Must be a valid number.") => {
                if (!checkRequired(field)) return false; // A required field must also be a number
                if (isNaN(parseFloat(field.value))) {
                    toggleError(field, message);
                    overallIsValid = false;
                    return false;
                }
                toggleError(field, null);
                return true;
            };
            
            // 1. Validate Proposed Building (PES)
            checkRequired(document.getElementById('buildingType'));
            checkRequired(document.getElementById('buildingUse'));
            checkNumber(document.getElementById('proposedBldgLat'));
            checkNumber(document.getElementById('proposedBldgLon'));

            // Special validation for Proposed Building NEC
            const propNecField = document.getElementById('proposedBldgNec');
            if (checkNumber(propNecField)) { // Only check bunker rule if it's a valid number
                const propNecValue = parseFloat(propNecField.value);
                const propType = document.getElementById('buildingType').value;
                if (propType === 'Underground Bunker' && propNecValue > 200) {
                    toggleError(propNecField, "Max NEC for Underground Bunker is 200 kg.");
                    overallIsValid = false;
                } else {
                    toggleError(propNecField, null); // Clear bunker error if type/value changes
                }
            }
            
            // 2. Validate Surrounding Buildings (ES) in both tables
            table1Body.querySelectorAll('tr').forEach(row => {
                const reverseRow = table2Body.querySelector(`[data-row-id="${row.id}"]`);
                // Validate fields in Table 1
                checkNumber(row.querySelector('.surrounding-bldg-lat'));
                checkNumber(row.querySelector('.surrounding-bldg-lon'));
                checkRequired(row.querySelector('.pes-orientation'));
                checkRequired(row.querySelector('.es-orientation'));
                
                if (reverseRow) {
                    // Validate fields in Table 2
                    checkRequired(reverseRow.querySelector('.reverse-type'));
                    checkRequired(reverseRow.querySelector('.reverse-use'));
                    checkRequired(reverseRow.querySelector('.pes-orientation'));
                    checkRequired(reverseRow.querySelector('.es-orientation'));
                    
                    // Special validation for Surrounding Building NEC
                    const surNecField = reverseRow.querySelector('.reverse-nec');
                    if(checkNumber(surNecField)){ // Only check bunker rule if it's a valid number
                        const surNecValue = parseFloat(surNecField.value);
                        const surType = reverseRow.querySelector('.reverse-type').value;
                        if (surType === 'Underground Bunker' && surNecValue > 200) {
                            toggleError(surNecField, "Max NEC for Bunker is 200 kg.");
                            overallIsValid = false;
                        } else {
                            toggleError(surNecField, null); // Clear bunker error
                        }
                    }
                }
            });

            return overallIsValid;
        };


        // ================== CORE LOGIC & CALCULATIONS ==================
        /**
         * Calculates the distance between two lat/lon points using the Haversine formula.
         * @returns {number} - Distance in meters.
         */
        const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
            if ([lat1, lon1, lat2, lon2].some(coord => isNaN(coord) || coord === null)) return 0;
            const R = 6371e3; // Earth's radius in meters
            const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
            const Δλ = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };
        
        /**
         * Calculates the required SIQD and PIQD based on NEC and building interaction types.
         * @returns {{siqd: number, piqd: number}} - Object containing required distances in meters.
         */
        const getRequiredDistances = (nec_in_kg, pes_type, es_type, pes_orientation, es_orientation) => {
            if (isNaN(nec_in_kg) || nec_in_kg <= 0 || !pes_type || !es_type || !pes_orientation || !es_orientation) {
                return { siqd: 0, piqd: 0 };
            }
        
            // Calculate the cube root of NEC (Q), a common factor in distance calculations.
            const Z = Math.pow(nec_in_kg, 1 / 3);
            
            // --- PIQD Calculation (Personnel & Inhabited Building Distance) ---
            const pes_type_for_piqd = pes_type === 'Process' ? 'Process' : pes_type;
            const piqdFactor = piqdFactors[pes_type_for_piqd] || 0;
            const piqd = piqdFactor > 0 ? piqdFactor * Z : 0;
        
            // --- SIQD Calculation (Inter-Magazine Distance) ---
            let siqd;
        
            // Special case for Underground Bunker as PES
            if (pes_type === 'Underground Bunker') {
                // Logic: SIQD = K * Q^(1/3) with K=2
                siqd = 2 * Z;
            } else {
                // Standard logic for all other building types using the D-Category table
                const mapType = (type) => (type === 'Process' ? 'Above Ground Magazine' : type);
                const pes_type_mapped = mapType(pes_type);
                const es_type_mapped = mapType(es_type);
        
                let d_category;
                if (pes_type_mapped === 'Above Ground Magazine') {
                    const traversalType = pes_orientation.includes('T') ? 'T' : 'UT';
                    d_category = tableIA_Data[pes_type_mapped]?.[traversalType]?.[es_type_mapped]?.[es_orientation];
                } else {
                    d_category = tableIA_Data[pes_type_mapped]?.[pes_orientation]?.[es_type_mapped]?.[es_orientation];
                }
                
                const siqdFactor = tableIB_Factors[d_category];
                siqd = siqdFactor ? siqdFactor * Z : 0;
            }
        
            return { siqd, piqd };
        };

        /**
         * Main function to trigger a full analysis of the form data.
         * It gathers inputs, runs calculations, and updates all tables and maps.
         */
        const runFullAnalysis = () => {
            // 1. Update global state with current proposed building data
            proposedBuilding.name = document.getElementById('proposedBldgName').value || 'Proposed Bldg (X)';
            proposedBuilding.lat = parseFloat(document.getElementById('proposedBldgLat').value);
            proposedBuilding.lon = parseFloat(document.getElementById('proposedBldgLon').value);
            proposedBuilding.nec = parseFloat(document.getElementById('proposedBldgNec').value);
            proposedBuilding.type = document.getElementById('buildingType').value;
            proposedBuilding.use = document.getElementById('buildingUse').value;

            // 2. Validate all inputs before proceeding. If invalid, stop execution.
            if (!validateAndHighlight()) {
                mapOutputSection.style.display = 'none';
                violationSummarySection.style.display = 'none';
                return;
            }

            // 3. Set distance units based on user selection
            const selectedUnit = unitSelector.value;
            const conversionFactor = selectedUnit === 'ft' ? METER_TO_FEET : 1;
            document.querySelectorAll('.unit-label').forEach(label => label.textContent = selectedUnit);

            // 4. Synchronize and analyze the reverse (Y to X) table
            syncAndAnalyzeReverseTable();

            // 5. Analyze the primary (X to Y) table
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
                if (distanceMeters > 0 && !isNaN(proposedBuilding.lat) && !isNaN(proposedBuilding.lon) && (proposedQdMeters.siqd > 0 || proposedQdMeters.piqd > 0)) {
                    const requiredDistMeters = proposedBuilding.use === 'Process' ? proposedQdMeters.piqd : proposedQdMeters.siqd;
                    remarksOutput.textContent = distanceMeters >= requiredDistMeters ? '✔️ Safe' : '❌ Violation';
                    remarksOutput.className = `remarks-output ${distanceMeters >= requiredDistMeters ? 'safe' : 'violation'}`;
                } else {
                    remarksOutput.textContent = 'Enter Inputs';
                    remarksOutput.className = 'remarks-output';
                }
            });

            // 6. Update the final summary and map visualization
            updateViolationSummary();
            renderOutputMap();
        };

        /**
         * Synchronizes the second table (Y->X) with the first (X->Y).
         * Calculates required distances from each surrounding building to the proposed one.
         */
        const syncAndAnalyzeReverseTable = () => {
            const surroundingRows = Array.from(table1Body.querySelectorAll('tr'));
            const reverseRows = Array.from(table2Body.querySelectorAll('tr'));
            const selectedUnit = unitSelector.value;
            const conversionFactor = selectedUnit === 'ft' ? METER_TO_FEET : 1;
            
            // Ensure table 2 has the same number of rows as table 1
            while (reverseRows.length < surroundingRows.length) {
                const newRow = table2Body.insertRow();
                newRow.innerHTML = createReverseRowHTML();
                reverseRows.push(newRow);
            }
            while (reverseRows.length > surroundingRows.length) reverseRows.pop().remove();

            // Update each row in table 2
            surroundingRows.forEach((sRow, index) => {
                const rRow = reverseRows[index];
                rRow.dataset.rowId = sRow.id;
                rRow.querySelector('.sur-name-reverse').textContent = sRow.querySelector('.surrounding-bldg-name').value || `Surrounding #${index + 1}`;
                const distanceMeters = parseFloat(sRow.dataset.distanceMeters || calculateHaversineDistance(parseFloat(document.getElementById('proposedBldgLat').value), parseFloat(document.getElementById('proposedBldgLon').value), parseFloat(sRow.querySelector('.surrounding-bldg-lat').value), parseFloat(sRow.querySelector('.surrounding-bldg-lon').value)));
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
                if (distanceMeters > 0 && !isNaN(proposedBuilding.lat) && !isNaN(proposedBuilding.lon) && (qdMeters.siqd > 0 || qdMeters.piqd > 0)) {
                    const requiredDistMeters = useType === 'Process' ? qdMeters.piqd : qdMeters.siqd;
                    remarksOutput.textContent = distanceMeters >= requiredDistMeters ? '✔️ Safe' : '❌ Violation';
                    remarksOutput.className = `remarks-output ${distanceMeters >= requiredDistMeters ? 'safe' : 'violation'}`;
                } else {
                    remarksOutput.textContent = 'Enter Inputs';
                    remarksOutput.className = 'remarks-output';
                }
            });
        };

        /**
         * Compiles and displays a summary of all safety distance violations.
         */
        const updateViolationSummary = () => {
            violationSummaryBody.innerHTML = '';
            const selectedUnit = unitSelector.value;
            const conversionFactor = selectedUnit === 'ft' ? METER_TO_FEET : 1;
            let violationsFoundOverall = false;
            const allSummaryPairs = {};

            // Aggregate data from the X -> Y table
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
                if (!allSummaryPairs[sName]) allSummaryPairs[sName] = { pairXY: null, pairYX: null, isFeasiblePair: true };
                allSummaryPairs[sName].pairXY = { pairLabel: `${proposedBuilding.name} → ${sName}`, reqDist: reqDistMeters, availDist: availDistMeters, shortfall, isViolation };
                if (isViolation) allSummaryPairs[sName].isFeasiblePair = false;
            });

            // Aggregate data from the Y -> X table
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
                if (!allSummaryPairs[sName]) allSummaryPairs[sName] = { pairXY: null, pairYX: null, isFeasiblePair: true };
                allSummaryPairs[sName].pairYX = { pairLabel: `${sName} → ${proposedBuilding.name}`, reqDist: reqDistMeters, availDist: availDistMeters, shortfall, isViolation };
                if (isViolation) allSummaryPairs[sName].isFeasiblePair = false;
            });

            // Render the summary table
            const sortedPairKeys = Object.keys(allSummaryPairs).sort();
            sortedPairKeys.forEach(key => {
                const pairData = allSummaryPairs[key];
                // CORRECTED: Render row if the analysis object exists, regardless of the required distance value.
                // This ensures both X->Y and Y->X rows are always shown.
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

        /**
         * Helper function to add a single row to the violation summary table.
         */
        const addSummaryRow = (data, factor, isFeasiblePair) => {
            let remarks = "Distance requirement met.";
            if (data.isViolation) {
                remarks = "Review layout or NEC.";
                if (data.shortfall >= -30 && data.shortfall < -10) remarks = "Reduce NEC or relocate.";
                else if (data.shortfall < -30) remarks = "Consider Bunker or major redesign.";
            }
            const rowClass = isFeasiblePair ? 'row-group-safe' : 'row-group-violation';
            const row = `<tr class="${rowClass}"><td>${data.pairLabel}</td><td>${(data.reqDist * factor).toFixed(2)}</td><td>${(data.availDist * factor).toFixed(2)}</td><td class="${data.isViolation ? 'shortfall-cell' : ''}">${data.isViolation ? data.shortfall.toFixed(1) + '%' : 'N/A'}</td><td class="remarks-output ${data.isViolation ? 'violation' : 'safe'}">${data.isViolation ? '❌ Violation' : '✔️ Safe'}</td><td>${remarks}</td></tr>`;
            violationSummaryBody.insertAdjacentHTML('beforeend', row);
        };

        /**
         * Renders all buildings, safety radii, and connection lines on the output map.
         */
        const renderOutputMap = () => {
            if (!outputMap) initializeOutputMap();
            outputMap.eachLayer(layer => { if (layer instanceof L.TileLayer === false && !layer.options.isLegend) outputMap.removeLayer(layer); });
            const pLat = proposedBuilding.lat, pLon = proposedBuilding.lon;
            const boundaryPoints = [];
            let allCoordinatesValidForMap = !isNaN(pLat) && !isNaN(pLon);
            table1Body.querySelectorAll('tr').forEach(row => { if (isNaN(parseFloat(row.querySelector('.surrounding-bldg-lat').value)) || isNaN(parseFloat(row.querySelector('.surrounding-bldg-lon').value))) allCoordinatesValidForMap = false; });
            if (!allCoordinatesValidForMap) { mapOutputSection.style.display = 'none'; return; }
            mapOutputSection.style.display = 'block';
            outputMap.invalidateSize();
            
            // Draw proposed building and its generic safety circles
            const pQD_generic = getRequiredDistances(proposedBuilding.nec, proposedBuilding.type, 'Bunker', 'Front T', 'Front T');
            L.marker([pLat, pLon]).addTo(outputMap).bindTooltip(`<b>${proposedBuilding.name}</b><br>(Proposed)`);
            L.circle([pLat, pLon], { radius: pQD_generic.piqd, color: PIQD_COLOR, weight: 2, fillOpacity: 0.15 }).addTo(outputMap).bindTooltip(`Proposed PIQD: ${pQD_generic.piqd.toFixed(1)}m`);
            L.circle([pLat, pLon], { radius: pQD_generic.siqd, color: SIQD_COLOR, weight: 2, fillOpacity: 0.15 }).addTo(outputMap).bindTooltip(`Proposed SIQD: ${pQD_generic.siqd.toFixed(1)}m`);
            boundaryPoints.push(L.latLng(pLat, pLon));

            // Draw each surrounding building, its circles, and connection lines
            table1Body.querySelectorAll('tr').forEach(sRow => {
                const rRow = table2Body.querySelector(`[data-row-id="${sRow.id}"]`);
                if (!rRow) return;
                const sLat = parseFloat(sRow.querySelector('.surrounding-bldg-lat').value), sLon = parseFloat(sRow.querySelector('.surrounding-bldg-lon').value);
                if (isNaN(sLat) || isNaN(sLon)) return;
                const sName = sRow.querySelector('.surrounding-bldg-name').value || `Surrounding ${sRow.id}`;
                const sNec = parseFloat(rRow.querySelector('.reverse-nec').value), sType = rRow.querySelector('.reverse-type').value, sUse = rRow.querySelector('.reverse-use').value;
                const sQD_generic = getRequiredDistances(sNec, sType, 'Bunker', 'Front T', 'Front T');
                L.marker([sLat, sLon]).addTo(outputMap).bindTooltip(`<b>${sName}</b>`);
                L.circle([sLat, sLon], { radius: sQD_generic.piqd, color: PIQD_COLOR, weight: 2, dashArray: '5, 5', fillOpacity: 0.1 }).addTo(outputMap);
                L.circle([sLat, sLon], { radius: sQD_generic.siqd, color: SIQD_COLOR, weight: 2, dashArray: '5, 5', fillOpacity: 0.1 }).addTo(outputMap);
                boundaryPoints.push(L.latLng(sLat, sLon));
                
                // Determine line color based on actual safety analysis
                const p_pes_orient = sRow.querySelector('.pes-orientation').value, p_es_orient = sRow.querySelector('.es-orientation').value;
                const pQD_actual = getRequiredDistances(proposedBuilding.nec, proposedBuilding.type, sType, p_pes_orient, p_es_orient);
                const s_pes_orient = rRow.querySelector('.pes-orientation').value, s_es_orient = rRow.querySelector('.es-orientation').value;
                const sQD_actual = getRequiredDistances(sNec, sType, proposedBuilding.type, s_pes_orient, s_es_orient);
                const dist = parseFloat(sRow.dataset.distanceMeters);
                const pReq = proposedBuilding.use === 'Process' ? pQD_actual.piqd : pQD_actual.siqd;
                const sReq = sUse === 'Process' ? sQD_actual.piqd : sQD_actual.siqd;
                const isOverallViolation = (dist < pReq) || (dist < sReq);
                const lineColor = isOverallViolation ? 'red' : 'green';
                const lineStyle = { color: lineColor, weight: 3, dashArray: isOverallViolation ? '5, 5' : '' };
                L.polyline([[pLat, pLon], [sLat, sLon]], lineStyle).addTo(outputMap).bindTooltip(`<b>${proposedBuilding.name} ↔ ${sName}</b><br>Status: <b style="color:${lineColor};">${isOverallViolation ? 'NOT FEASIBLE' : 'FEASIBLE'}</b>`);
            });

            // Adjust map view to fit all markers
            if (boundaryPoints.length > 1) outputMap.fitBounds(L.latLngBounds(boundaryPoints).pad(0.2));
            else if (boundaryPoints.length === 1) outputMap.setView(boundaryPoints[0], 15);
        };

        // ================== DOM MANIPULATION & DYNAMIC CONTENT ==================
        /**
         * Adds a new row to the surrounding buildings table (Table 1).
         */
        const addSurroundingRow = () => {
            const rowId = `row-${Date.now()}`;
            const newRow = table1Body.insertRow();
            newRow.id = rowId;
            const orientationOptions = '<option value="">Select</option><option value="Side">Side</option><option value="Rear">Rear</option><option value="Front T">Front T</option><option value="Front UT">Front UT</option>';
            newRow.innerHTML = `<td class="proposed-bldg-name"></td><td><input type="text" class="surrounding-bldg-name" placeholder="Name/No. of Surrounding Bldg"><div class="inline-group coord-group"><input type="text" class="surrounding-bldg-lat" placeholder="Latitude"><input type="text" class="surrounding-bldg-lon" placeholder="Longitude"></div><button type="button" class="map-btn">Set on Map</button></td><td><select class="pes-orientation">${orientationOptions}</select></td><td><select class="es-orientation">${orientationOptions}</select></td><td class="siqd-required"></td><td class="piqd-required"></td><td class="distance-available"></td><td class="remarks-output"></td>`;
            syncAndAnalyzeReverseTable();
        };
        
        /**
         * Generates HTML <option> tags for building type dropdowns.
         * @param {string} selectedValue - The value to be pre-selected.
         * @returns {string} - The HTML string of options.
         */
        const getBuildingTypeOptions = (selectedValue) => {
            let options = '<option value="">Select Type</option>';
            buildingTypes.forEach(type => {
                options += `<option value="${type}" ${type === selectedValue ? 'selected' : ''}>${type}</option>`;
            });
            options += '<option value="Process">Process Building</option>';
            return options;
        };
        
        /**
         * Populates all building type dropdowns with the latest options.
         */
        const updateAllBuildingTypeDropdowns = () => {
            const selects = document.querySelectorAll('#buildingType, .reverse-type');
            selects.forEach(select => {
                const currentValue = select.value;
                select.innerHTML = getBuildingTypeOptions(currentValue);
            });
        };

        /**
         * Creates the HTML structure for a new row in the reverse table (Table 2).
         * @returns {string} - The inner HTML for a new table row.
         */
        const createReverseRowHTML = () => {
            const orientationOptions = '<option value="">Select</option><option value="Side">Side</option><option value="Rear">Rear</option><option value="Front T">Front T</option><option value="Front UT">Front UT</option>';
            const typeOptions = getBuildingTypeOptions();
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

        // ================== MAP MODAL LOGIC ==================
        /**
         * Draws existing building locations as context on the modal map.
         */
        const drawContextOnModalMap = (mapInstance) => {
            mapInstance.eachLayer(layer => { if (!(layer instanceof L.TileLayer)) mapInstance.removeLayer(layer); });
            const boundaryPoints = [];
            if (!isNaN(proposedBuilding.lat) && !isNaN(proposedBuilding.lon)) {
                L.marker([proposedBuilding.lat, proposedBuilding.lon]).addTo(mapInstance).bindTooltip(proposedBuilding.name || 'Proposed Building');
                boundaryPoints.push(L.latLng(proposedBuilding.lat, proposedBuilding.lon));
            }
            table1Body.querySelectorAll('tr').forEach((sRow) => {
                const sLat = parseFloat(sRow.querySelector('.surrounding-bldg-lat').value), sLon = parseFloat(sRow.querySelector('.surrounding-bldg-lon').value);
                if (!isNaN(sLat) && !isNaN(sLon)) {
                    L.marker([sLat, sLon]).addTo(mapInstance).bindTooltip(sRow.querySelector('.surrounding-bldg-name').value || `Surrounding`);
                    boundaryPoints.push(L.latLng(sLat, sLon));
                }
            });
            if (boundaryPoints.length > 0) mapInstance.fitBounds(L.latLngBounds(boundaryPoints).pad(0.3));
            else mapInstance.setView([28.6139, 77.2090], 10);
        };

        /**
         * Handles clicks on the modal map to place or move a marker.
         */
        const handleMapClick = (e) => {
            const latlng = e.latlng;
            if (selectionMarker) selectionMarker.setLatLng(latlng);
            else {
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
                if (reverseRow) { nec = parseFloat(reverseRow.querySelector('.reverse-nec').value); type = reverseRow.querySelector('.reverse-type').value; }
            }
            const qd = getRequiredDistances(nec, type, 'Bunker', 'Front T', 'Front T');
            if (qd.siqd > 0) {
                selectionPiqdCircle = L.circle(latlng, { radius: qd.piqd, color: PIQD_COLOR, weight: 2, dashArray: '5, 5', fillOpacity: 0.2, interactive: false }).addTo(modalMap);
                selectionSiqdCircle = L.circle(latlng, { radius: qd.siqd, color: SIQD_COLOR, weight: 2, dashArray: '5, 5', fillOpacity: 0.2, interactive: false }).addTo(modalMap);
            }
        };

        /**
         * Opens and configures the map modal for setting a building's location.
         * @param {object} context - Specifies if the modal is for the 'proposed' or a 'surrounding' building.
         */
        const openMapModal = (context) => {
            activeMapContext = context;
            mapModal.style.display = 'block';
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

        /**
         * Cleans up map modal layers and hides the modal.
         * @param {HTMLElement} modalElement - The modal element to close.
         */
        const closeModalAndCleanup = (modalElement) => {
            if (selectionMarker && modalMap) modalMap.removeLayer(selectionMarker);
            if (selectionSiqdCircle && modalMap) modalMap.removeLayer(selectionSiqdCircle);
            if (selectionPiqdCircle && modalMap) modalMap.removeLayer(selectionPiqdCircle);
            selectionMarker = selectionSiqdCircle = selectionPiqdCircle = null;
            if (modalMap) modalMap.off('click', handleMapClick);
            modalElement.style.display = 'none';
        };

        // ================== EVENT HANDLERS & INITIALIZATION ==================
        // Attach event listeners to interactive elements.
        
        // Handle confirming a location from the map modal
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
            closeModalAndCleanup(mapModal);
            runFullAnalysis();
        });

        // Handle canceling the map modal
        document.getElementById('cancelModalBtn').addEventListener('click', () => closeModalAndCleanup(mapModal));
        
        // Open map modal for the proposed building
        document.getElementById('setProposedLocationBtn').addEventListener('click', () => openMapModal({ type: 'proposed' }));
        
        // Open map modal for a surrounding building (event delegation)
        table1Body.addEventListener('click', e => { if (e.target.classList.contains('map-btn')) openMapModal({ type: 'surrounding', row: e.target.closest('tr') }); });
        
        // Add a new surrounding building row
        document.getElementById('addSurroundingBtn').addEventListener('click', addSurroundingRow);
        
        // Run analysis on any form input change for real-time validation and calculation
        formContainer.addEventListener('input', runFullAnalysis);
        
        // Database actions
        document.getElementById('saveAnalysisBtn').addEventListener('click', saveAnalysisToSupabase);
        document.getElementById('loadAnalysisBtn').addEventListener('click', () => { loadProjectFromSupabase(document.getElementById('analysisSelector').value); });

        // --- Initial setup on page load ---
        updateAllBuildingTypeDropdowns(); // Populate dropdowns
        addSurroundingRow(); // Start with one surrounding building row
        initializeOutputMap(); // Create the output map
        runFullAnalysis(); // Run an initial analysis to catch any initial invalid states
    });
