function showAlert(message, type) {
    const alert = $(`
        <div class="alert alert-${type} alert-dismissible fade show custom-alert" role="alert">
            ${message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    `);
    $('#alerts').append(alert);
    setTimeout(() => {
        alert.alert('close');
    }, 5000); // Auto close after 5 seconds
}

function submitScale(namespace, name, replicas, type) {
    const url = type === 'Deployment' ? `/scale-deployment/${namespace}/${name}` : `/scale-statefulset/${namespace}/${name}`;

    $.ajax({
        url: url,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ replicas: parseInt(replicas) }),
        success: function (response) {
            showAlert(`${type} "${name}" scaled successfully`, 'success');
            fetchResources(namespace);
        },
        error: function (error) {
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

function fetchDeploymentPods(namespace, name) {
    $.get(`/deployment-pods/${namespace}/${name}`, function (data) {
        console.log('Deployment Pods:', data);
        const pods = data.pods;
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
        $('#podsModalBody').html(podsTable);
        $('#podsModal').modal('show');
    }).fail(function () {
        console.error('Failed to fetch deployment pods');
    });
}

function fetchStatefulSetPods(namespace, name) {
    $.get(`/statefulset-pods/${namespace}/${name}`, function (data) {
        console.log('StatefulSet Pods:', data);
        const pods = data.pods;
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
        $('#podsModalBody').html(podsTable);
        $('#podsModal').modal('show');
    }).fail(function () {
        console.error('Failed to fetch statefulset pods');
    });
}

function fetchPodLogs(namespace, name) {
    $.get(`/pod-logs/${namespace}/${name}`, function (data) {
        console.log('Pod Logs:', data);
        const logs = data.logs;
        const logsPre = $('<pre></pre>').text(logs);
        $('#logsModalBody').html(logsPre);
        $('#logsModal').modal('show');
    }).fail(function () {
        console.error('Failed to fetch pod logs');
    });
}

function deletePod(namespace, name) {
    $.ajax({
        url: `/delete-job/${namespace}/${name}`,
        type: 'DELETE',
        success: function (response) {
            showAlert(`Pod "${name}" deleted successfully`, 'success');
            fetchResources(namespace);
        },
        error: function (error) {
            showAlert(`Error deleting pod "${name}"`, 'danger');
        }
    });
}

function showEditCronJobModal(namespace, name, schedule) {
    $('#editCronJobModalLabel').text(`Edit CronJob Schedule for ${name}`);
    $('#cronJobSchedule').val(schedule);
    $('#editCronJobModal').modal('show');
    $('#editCronJobForm').off('submit').on('submit', function (event) {
        event.preventDefault();
        const newSchedule = $('#cronJobSchedule').val();
        editCronJobSchedule(namespace, name, newSchedule);
    });
}

function editCronJobSchedule(namespace, name, schedule) {
    $.ajax({
        url: `/edit-cronjob/${namespace}/${name}`,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ schedule: schedule }),
        success: function (response) {
            showAlert(`CronJob "${name}" schedule updated successfully`, 'success');
            fetchResources(namespace);
            $('#editCronJobModal').modal('hide');
        },
        error: function (error) {
            showAlert(`Error updating schedule for CronJob "${name}"`, 'danger');
        }
    });
}

function showRelatedJobs(namespace, cronjobName) {
    fetch(`/jobs/${namespace}/${cronjobName}`)
        .then(response => response.json())
        .then(data => {
            var relatedJobsList = $('#relatedJobsList');
            relatedJobsList.empty();
            data.jobs.forEach(job => {
                const startTime = new Date(job.start_time);
                const age = Math.floor((Date.now() - startTime) / (1000 * 60)); // Age in minutes
                relatedJobsList.append(`
                    <tr>
                        <td>${job.name}</td>
                        <td>${job.status}</td>
                        <td>${age} minutes</td>
                        <td>
                            <button class="btn btn-danger btn-sm" onclick="deleteJob('${namespace}', '${job.name}')">Delete</button>
                        </td>
                    </tr>
                `);
            });
            $('#relatedJobsModal').modal('show');
        })
        .catch(error => {
            console.error('Error fetching related jobs:', error);
        });
}

function deleteJob(namespace, jobName) {
    fetch(`/delete-job/${namespace}/${jobName}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        showAlert(`Job "${jobName}" deleted successfully`, 'success');
        // Refresh the related jobs list
        const cronjobName = $('#relatedJobsModal').data('cronjob-name');
        showRelatedJobs(cronjobName, namespace);
    })
    .catch(error => {
        showAlert(`Error deleting job "${jobName}"`, 'danger');
        console.error('Error deleting job:', error);
    });
}

