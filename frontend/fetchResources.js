function fetchResources(namespace) {
    $('#resources').empty();
    fetchStatefulSets(namespace);
    fetchDeployments(namespace);
    fetchCronJobs(namespace);
    fetchAllPods(namespace);
}

function fetchStatefulSets(namespace) {
    $.get(`/statefulsets/${namespace}`, function(data) {
        console.log('StatefulSets:', data);
        const statefulsets = data.statefulsets;
        const statefulsetsTable = $('<table class="table table-striped"></table>').append('<thead><tr><th>Name</th><th>Replicas</th><th>Actions</th></tr></thead>');
        const statefulsetsBody = $('<tbody></tbody>');
        statefulsets.forEach(ss => {
            const statefulsetRow = $(`
                <tr>
                    <td>${ss.name}</td>
                    <td>${ss.replicas}</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="scaleStatefulSet('${namespace}', '${ss.name}', ${ss.replicas})">Scale</button>
                        ${ss.replicas > 0 ? `<button class="btn btn-secondary btn-sm" onclick="fetchStatefulSetPods('${namespace}', '${ss.name}')">View Pods</button>` : ''}
                    </td>
                </tr>
            `);
            statefulsetsBody.append(statefulsetRow);
        });
        statefulsetsTable.append(statefulsetsBody);
        $('#resources').append('<h5>StatefulSets</h5>').append(statefulsetsTable);
    }).fail(function() {
        console.error('Failed to fetch statefulsets');
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
                        <button class="btn btn-primary btn-sm" onclick="scaleDeployment('${namespace}', '${dp.name}', ${dp.replicas})">Scale</button>
                        ${dp.replicas > 0 ? `<button class="btn btn-secondary btn-sm" onclick="fetchDeploymentPods('${namespace}', '${dp.name}')">View Pods</button>` : ''}
                    </td>
                </tr>
            `);
            deploymentsBody.append(deploymentRow);
        });
        deploymentsTable.append(deploymentsBody);
        $('#resources').append('<h5>Deployments</h5>').append(deploymentsTable);
    }).fail(function() {
        console.error('Failed to fetch deployments');
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
                        <button class="btn btn-secondary btn-sm" onclick="fetchCronJobJobs('${namespace}', '${cj.name}')">View Jobs</button>
                        <button class="btn btn-primary btn-sm" onclick="showEditCronJobModal('${namespace}', '${cj.name}', '${cj.schedule}')">Edit Schedule</button>
                    </td>
                </tr>
            `);
            cronjobsBody.append(cronjobRow);
        });
        cronjobsTable.append(cronjobsBody);
        $('#resources').append('<h5>CronJobs</h5>').append(cronjobsTable);
    }).fail(function() {
        console.error('Failed to fetch cronjobs');
    });
}

function fetchAllPods(namespace) {
    $.get(`/pods/${namespace}`, function(data) {
        console.log('All Pods:', data);
        const pods = data.pods;
        const podsTable = $('<table class="table table-striped"></table>').append('<thead><tr><th>Name</th><th>State</th><th>Age</th><th>Actions</th></tr></thead>');
        const podsBody = $('<tbody></tbody>');
        pods.forEach(pod => {
            const startTime = new Date(pod.start_time);
            const age = Math.floor((Date.now() - startTime) / (1000 * 60)); // Age in minutes
            const podRow = $(`
                <tr>
                    <td>${pod.name}</td>
                    <td>${pod.state}</td>
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
        $('#resources').append('<h5>All Pods</h5>').append(podsTable);
    }).fail(function() {
        console.error('Failed to fetch all pods');
    });
}
