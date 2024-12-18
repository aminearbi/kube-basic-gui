let currentNamespace = '';
let podsInterval;

function fetchResources(namespace) {
    updateNamespaceDisplay(namespace);
    currentNamespace = namespace;
    $('#deployments-section').empty();
    $('#statefulsets-section').empty();
    $('#cronjobs-section').empty();
    $('#pods-section').empty();
    $('#pvcs-section').empty();
    fetchDeployments(namespace); // Fetch Deployments first
    fetchStatefulSets(namespace); // Fetch StatefulSets second
    fetchCronJobs(namespace); // Fetch CronJobs third
    fetchAllPods(namespace, 1); // Start with page 1
    fetchPVCs(namespace); // Fetch PVCs

    // Clear any existing interval
    if (podsInterval) {
        clearInterval(podsInterval);
    }

    // Set up periodic update for the pods table
    podsInterval = setInterval(function() {
        fetchAllPods(currentNamespace, 1);
    }, 30000); // Update every 30 seconds
}

function fetchPVCs(namespace) {
    $.get(`/pvcs/${namespace}`, function(data) {
        console.log('PVCs:', data);
        const pvcs = data.pvcs;
        const pvcsTable = $('<table class="table table-striped"></table>').append('<thead><tr><th>Name</th><th>Status</th><th>Volume</th><th>Capacity</th><th>Access Modes</th><th>Storage Class</th></tr></thead>');
        const pvcsBody = $('<tbody></tbody>');
        pvcs.forEach(pvc => {
            const accessModes = pvc.access_modes ? pvc.access_modes.join(', ') : 'N/A';
            const pvcRow = $(`
                <tr>
                    <td>${pvc.name}</td>
                    <td>${pvc.status}</td>
                    <td>${pvc.volume}</td>
                    <td>${pvc.capacity}</td>
                    <td>${accessModes}</td>
                    <td>${pvc.storage_class}</td>
                </tr>
            `);
            pvcsBody.append(pvcRow);
        });
        pvcsTable.append(pvcsBody);
        $('#pvcs-section').append('<h5>Persistent Volume Claims (PVCs)</h5>').append(pvcsTable);
    }).fail(function() {
        console.error('Failed to fetch PVCs');
    });
}





function fetchDeployments(namespace) {
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

function fetchStatefulSets(namespace) {
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

function fetchCronJobs(namespace) {
    $.get(`/cronjobs/${namespace}`, function(data) {
        console.log('CronJobs:', data);
        const cronjobs = data.cronjobs;
        const cronjobsTable = $('<table class="table table-striped"></table>').append('<thead><tr><th>Name</th><th>Schedule</th><th>Actions</th></tr></thead>');
        const cronjobsBody = $('<tbody></tbody>');
        cronjobs.forEach(cj => {
            const cronjobRow = $(`
                <tr>
                    <td>${cj.name}</td>
                    <td>${cj.schedule}</td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="showRelatedJobs('${namespace}', '${cj.name}')">View Jobs</button>
                        <button class="btn btn-primary btn-sm" onclick="showEditCronJobModal('${namespace}', '${cj.name}', '${cj.schedule}')">Edit Schedule</button>
                        <button class="btn btn-success btn-sm" onclick="createJobFromCronjob('${namespace}', '${cj.name}')">Create Job</button>
                    </td>
                </tr>
            `);
            cronjobsBody.append(cronjobRow);
        });
        cronjobsTable.append(cronjobsBody);
        $('#cronjobs-section').append('<h5>CronJobs</h5>').append(cronjobsTable);
    }).fail(function() {
        console.error('Failed to fetch cronjobs');
    });
}

function fetchAllPods(namespace, page) {
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
                fetchAllPods(namespace, i);
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

$(document).ready(function () {
    showSection('deployments-section'); // Show deployments section by default
    loadNamespace(); // Load the last selected namespace

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
        if (searchTerm) {
            $('#logsModalBody').html(function (_, html) {
                var regex = new RegExp('(' + searchTerm + ')', 'gi');
                return html.replace(regex, '<mark>$1</mark>');
            });
        }
    });
});