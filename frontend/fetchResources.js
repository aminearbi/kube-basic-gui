let currentNamespace = '';
let podsInterval;
let eventsSource;
let eventsArray = [];

function fetchResources() {
    const namespace = getNamespace();
    console.log(`Fetching resources for namespace: ${namespace}`);
    updateNamespaceDisplay(namespace);
    currentNamespace = namespace;
    clearSections();
    fetchDeployments(); // Fetch Deployments first
    fetchStatefulSets(); // Fetch StatefulSets second
    fetchCronJobs(); // Fetch CronJobs third
    fetchAllPods(1); // Start with page 1
    fetchPVCs(); // Fetch PVCs
    startEventStream(namespace); // Start event stream

    // Clear any existing interval
    if (podsInterval) {
        clearInterval(podsInterval);
    }

    // Set up periodic update for the pods table
    podsInterval = setInterval(function() {
        fetchAllPods(1);
    }, 30000); // Update every 30 seconds
}
function clearSections() {
    $('#deployments-section').empty();
    $('#statefulsets-section').empty();
    $('#cronjobs-section').empty();
    $('#pods-section').empty();
    $('#pvcs-section').empty();
    $('#events-section tbody').empty();
}


function startEventStream(namespace) {
    if (eventsSource) {
        eventsSource.close();
    }

    eventsSource = new EventSource(`/events/${namespace}`);
    eventsSource.onmessage = function(event) {
        const eventData = JSON.parse(event.data);
        updateEventsTable(eventData);
    };

    eventsSource.onerror = function(error) {
        console.error('Error in event stream:', error);
        eventsSource.close();
    };
}

function updateEventsTable(event) {
    const eventsList = $('#eventsList');
    const first_timestamp = new Date(event.first_timestamp).toLocaleString('en-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZoneName: 'short'
    });
    const eventRow = `
        <tr>
            <td>${event.type}</td>
            <td>${event.reason}</td>
            <td>${event.message}</td>
            <td>${first_timestamp}</td>
            <td>${event.involved_object.kind}</td>
            <td>${event.involved_object.name}</td>
        </tr>
    `;
    eventsList.append(eventRow);
}



function fetchPVCs() {
    const namespace = getNamespace();
    console.log(`Fetching PVCs for namespace: ${namespace}`);
    $.get(`/pvcs/${namespace}`, function(data) {
        console.log('PVCs:', data);
        const pvcs = data.pvcs;
        const pvcsTable = $('<table class="table table-striped"></table>').append('<thead><tr><th>Name</th><th>Status</th><th>Capacity</th><th>Access Modes</th><th>Storage Class</th></tr></thead>');
        const pvcsBody = $('<tbody></tbody>');
        pvcs.forEach(pvc => {
            const accessModes = pvc.access_modes ? pvc.access_modes.join(', ') : 'N/A';
            const pvcRow = $(`
                <tr>
                    <td>${pvc.name}</td>
                    <td>${pvc.status}</td>
                    <td>${pvc.capacity}</td>
                    <td>${accessModes}</td>
                    <td>${pvc.storage_class}</td>
                </tr>
            `);
            pvcsBody.append(pvcRow);
        });
        pvcsTable.append(pvcsBody);
        $('#pvcs-section').html('<h5>Persistent Volume Claims</h5>').append(pvcsTable); // Update only the PVCs section
    }).fail(function() {
        console.error('Failed to fetch PVCs');
    });
}

function fetchDeployments() {
    const namespace = getNamespace();
    $.get(`/deployments/${namespace}`, function(data) {
        console.log('Deployments:', data);
        const deployments = data.deployments;
        const deploymentsTable = $('<table class="table table-striped"></table>').append('<thead><tr><th>Name</th><th>Replicas</th><th>Actions</th></tr></thead>');
        const deploymentsBody = $('<tbody></tbody>');
        deployments.forEach(dp => {
            const deploymentRow = $(`
                <tr>
                    <td>${dp.name}</td>
                    <td>${dp.replicas}</td>
                    <td>
                        <button class="btn btn-primary btn-sm scale-btn" onclick="showScaleModal('${namespace}', '${dp.name}', ${dp.replicas}, 'Deployment')">Scale</button>
                        <button class="btn btn-success btn-sm" onclick="submitScale('${namespace}', '${dp.name}', 1, 'Deployment')">Scale Up</button>
                        <button class="btn btn-danger btn-sm" onclick="submitScale('${namespace}', '${dp.name}', 0, 'Deployment')">Scale Down</button>
                        ${dp.replicas > 0 ? `<button class="btn btn-secondary btn-sm" onclick="fetchDeploymentPods('${namespace}', '${dp.name}')">View Pods</button>` : ''}
                    </td>
                </tr>
            `);
            deploymentsBody.append(deploymentRow);
        });
        deploymentsTable.append(deploymentsBody);
        $('#deployments-section').append('<h5>Deployments</h5>').append(deploymentsTable);
    }).fail(function() {
        console.error('Failed to fetch deployments');
    });
}

function fetchStatefulSets() {
    const namespace = getNamespace();
    $.get(`/statefulsets/${namespace}`, function(data) {
        console.log('StatefulSets:', data);
        const statefulsets = data.statefulsets;
        const statefulsetsTable = $('<table class="table table-striped"></table>'). append('<thead><tr><th>Name</th><th>Replicas</th><th>Actions</th></tr></thead>');
        const statefulsetsBody = $('<tbody></tbody>');
        statefulsets.forEach(ss => {
            const statefulsetRow = $(`
                <tr>
                    <td>${ss.name}</td>
                    <td>${ss.replicas}</td>
                    <td>
                        <button class="btn btn-primary btn-sm scale-btn" onclick="showScaleModal('${namespace}', '${ss.name}', ${ss.replicas}, 'StatefulSet')">Scale</button>
                        <button class="btn btn-success btn-sm" onclick="submitScale('${namespace}', '${ss.name}', 1, 'StatefulSet')">Scale Up</button>
                        <button class="btn btn-danger btn-sm" onclick="submitScale('${namespace}', '${ss.name}', 0, 'StatefulSet')">Scale Down</button>
                        ${ss.replicas > 0 ? `<button class="btn btn-secondary btn-sm" onclick="fetchStatefulSetPods('${namespace}', '${ss.name}')">View Pods</button>` : ''}
                    </td>
                </tr>
            `);
            statefulsetsBody.append(statefulsetRow);
        });
        statefulsetsTable.append(statefulsetsBody);
        $('#statefulsets-section').append('<h5>StatefulSets</h5>').append(statefulsetsTable);
    }).fail(function() {
        console.error('Failed to fetch statefulsets');
    });
}

function fetchCronJobs() {
    const namespace = getNamespace();
    console.log(`Fetching cronjobs for namespace: ${namespace}`);
    $.get(`/cronjobs/${namespace}`, function(data) {
        console.log('CronJobs:', data);
        const cronjobs = data.cronjobs;
        const cronjobsTable = $('<table class="table table-striped"></table>').append('<thead><tr><th>Name</th><th>Schedule</th><th>Status</th><th>Actions</th></tr></thead>');
        const cronjobsBody = $('<tbody></tbody>');
        cronjobs.forEach(cj => {
            const actionButton = cj.suspend
                ? `<button class="btn btn-info btn-sm" onclick="continueCronJob('${namespace}', '${cj.name}')">Continue</button>`
                : `<button class="btn btn-warning btn-sm" onclick="suspendCronJob('${namespace}', '${cj.name}')">Suspend</button>`;
            const cronjobRow = $(`
                <tr>
                    <td>${cj.name}</td>
                    <td>${cj.schedule}</td>
                    <td>${cj.suspend ? 'Suspended' : 'Active'}</td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="showRelatedJobs('${namespace}', '${cj.name}')">View Jobs</button>
                        <button class="btn btn-primary btn-sm" onclick="showEditCronJobModal('${namespace}', '${cj.name}', '${cj.schedule}')">Edit Schedule</button>
                        <button class="btn btn-success btn-sm" onclick="createJobFromCronjob('${namespace}', '${cj.name}')">Create Job</button>
                        ${actionButton}
                    </td>
                </tr>
            `);
            cronjobsBody.append(cronjobRow);
        });
        cronjobsTable.append(cronjobsBody);
        $('#cronjobs-section').empty().append('<h5>CronJobs</h5>').append(cronjobsTable);
    }).fail(function() {
        console.error('Failed to fetch cronjobs');
    });
}

function suspendCronJob(namespace, name) {
    console.log(`Suspending cronjob ${name} in namespace ${namespace}`);
    $.ajax({
        url: `/cronjobs/suspend/${namespace}/${name}`,
        type: 'PATCH',
        success: function(response) {
            console.log(response.message);
            showAlert(`Cronjob "${name}" suspended successfully`, 'success');
            fetchResources(namespace);
        },
        error: function(error) {
            console.error(`Error suspending cronjob ${name}:`, error);
            showAlert(`Error suspending cronjob "${name}"`, 'danger');
        }
    });
}

function continueCronJob(namespace, name) {
    console.log(`Continuing cronjob ${name} in namespace ${namespace}`);
    $.ajax({
        url: `/cronjobs/continue/${namespace}/${name}`,
        type: 'PATCH',
        success: function(response) {
            console.log(response.message);
            showAlert(`Cronjob "${name}" continued successfully`, 'success');
            fetchResources(namespace);
        },
        error: function(error) {
            console.error(`Error continuing cronjob ${name}:`, error);
            showAlert(`Error continuing cronjob "${name}"`, 'danger');
        }
    });
}

function fetchAllPods(page) {
    const namespace = getNamespace();
    $.get(`/pods/${namespace}?page=${page}`, function(data) {
        console.log('All Pods:', data);
        const pods = data.pods;
        const totalPages = data.totalPages;
        const podsTable = $('<table class="table table-striped"></table>').append('<thead><tr><th>Name</th><th>State</th><th>Age</th><th>Actions</th></tr></thead>');
        const podsBody = $('<tbody></tbody>');
        pods.forEach(pod => {
            const startTime = new Date(pod.start_time);
            const age = Math.floor((Date.now() - startTime) / (1000 * 60)); // Age in minutes
            const podRow = $(`
                <tr>
                    <td>${pod.name}</td>
                    <td>${pod.state || 'Unknown'}</td>
                    <td>${age} minutes</td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="fetchPodLogs('${namespace}', '${pod.name}')">View Logs</button>
                        <button class="btn btn-danger btn-sm" onclick="deletePod('${namespace}', '${pod.name}')">Delete</button>
                    </td>
                </tr>
            `);
            podsBody.append(podRow);
        });
        podsTable.append(podsBody);
        $('#pods-section').html('<h5>All Pods</h5>').append(podsTable); // Update only the pods section

        // Pagination
        const pagination = $('<nav aria-label="Page navigation"></nav>');
        const paginationList = $('<ul class="pagination"></ul>');
        for (let i = 1; i <= totalPages; i++) {
            const pageItem = $(`<li class="page-item ${i === page ? 'active' : ''}"><a class="page-link" href="#">${i}</a></li>`);
            pageItem.on('click', function() {
                fetchAllPods(i);
            });
            paginationList.append(pageItem);
        }
        pagination.append(paginationList);
        $('#pods-section').append(pagination); // Update only the pods section
    }).fail(function() {
        console.error('Failed to fetch all pods');
    });
}

function showScaleModal(namespace, name, replicas, type) {
    $('#scaleModalLabel').text(`Scale ${type}`);
    $('#scaleModalNamespace').val(namespace);
    $('#scaleModalName').val(name);
    $('#scaleModalReplicas').val(replicas);
    $('#scaleModalType').val(type);
    $('#scaleModal').modal('show');
}

function submitScale(namespace, name, replicas, type) {
    const url = type === 'Deployment' ? `/scale-deployment/${namespace}/${name}` : `/scale-statefulset/${namespace}/${name}`;

    $.ajax({
        url: url,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ replicas: parseInt(replicas) }),
        success: function(response) {
            showAlert(`${type} "${name}" scaled successfully`, 'success');
            fetchResources(namespace);
        },
        error: function(error) {
            showAlert(`Error scaling ${type} "${name}"`, 'danger');
        }
    });
}

function submitScaleModal() {
    const namespace = $('#scaleModalNamespace').val();
    const name = $('#scaleModalName').val();
    const replicas = $('#scaleModalReplicas').val();
    const type = $('#scaleModalType').val();
    submitScale(namespace, name, replicas, type);
}

function updateNamespaceDisplay(namespace) {
    // Save the selected namespace to localStorage
    localStorage.setItem('selectedNamespace', namespace);
    console.log(`Namespace ${namespace} saved to localStorage`);

    // Update the display or perform other actions as needed
    $('#currentNamespace').text(`: ${namespace}`);

    // Start event stream
    startEventStream(namespace);
}


// Example usage: Attach click event listener to namespace elements
$(document).ready(function() {
    $('#namespaces').on('click', 'li', function() {
        const namespace = $(this).text();
    });

    // Load namespace on page load
    const namespace = getNamespace();
    updateNamespaceDisplay(namespace);
});


$(document).ready(function () {
    showSection('deployments-section'); // Show deployments section by default

    // Load the saved theme
    var savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'alternative') {
        $('#themeButton').text('Switch to Default Theme');
        $('#themeStylesheet').attr('href', 'alternative-theme.css');
    } else {
        $('#themeButton').text('Switch to Alternative Theme');
        $('#themeStylesheet').attr('href', 'default-theme.css');
    }

    // Search logs
    $('#logSearch').on('input', function () {
        var searchTerm = $(this).val().toLowerCase();
        $('#logsModalBody').html(function (_, html) {
            return html.replace(/<mark>/g, '').replace(/<\/mark>/g, '');
        });
    });
});