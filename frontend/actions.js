function scaleStatefulSet(namespace, name, replicas) {
    const newReplicas = prompt('Enter new number of replicas:', replicas);
    if (newReplicas !== null) {
        $.ajax({
            url: `/scale-statefulset/${namespace}/${name}`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ replicas: parseInt(newReplicas) }),
            success: function(response) {
                alert('StatefulSet scaled successfully');
                fetchResources(namespace);
            },
            error: function(error) {
                alert('Error scaling StatefulSet');
            }
        });
    }
}

function scaleDeployment(namespace, name, replicas) {
    const newReplicas = prompt('Enter new number of replicas:', replicas);
    if (newReplicas !== null) {
        $.ajax({
            url: `/scale-deployment/${namespace}/${name}`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ replicas: parseInt(newReplicas) }),
            success: function(response) {
                alert('Deployment scaled successfully');
                fetchResources(namespace);
            },
            error: function(error) {
                alert('Error scaling Deployment');
            }
        });
    }
}

function fetchStatefulSetPods(namespace, statefulsetName) {
    $.get(`/statefulset-pods/${namespace}/${statefulsetName}`, function(data) {
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
        $('#podsModalBody').html(podsTable);
        $('#podsModal').modal('show');
    }).fail(function() {
        console.error('Failed to fetch statefulset pods');
    });
}

function fetchDeploymentPods(namespace, deploymentName) {
    $.get(`/deployment-pods/${namespace}/${deploymentName}`, function(data) {
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
        $('#podsModalBody').html(podsTable);
        $('#podsModal').modal('show');
    }).fail(function() {
        console.error('Failed to fetch deployment pods');
    });
}

function fetchPodLogs(namespace, podName) {
    $.get(`/pod-logs/${namespace}/${podName}`, function(data) {
        console.log('Pod Logs:', data);
        const logs = data.logs;
        $('#logsModalBody').text(logs);
        $('#logsModal').modal('show');
    }).fail(function() {
        console.error('Failed to fetch pod logs');
    });
}

function fetchCronJobJobs(namespace, cronjobName) {
    $.get(`/jobs/${namespace}/${cronjobName}`, function(data) {
        console.log('Jobs:', data);
        const jobs = data.jobs;
        const jobsTable = $('<table class="table table-striped"></table>').append('<thead><tr><th>Name</th><th>Actions</th></tr></thead>');
        const jobsBody = $('<tbody></tbody>');
        jobs.forEach(job => {
            const jobRow = $(`
                <tr>
                    <td>${job.name}</td>
                    <td>
                        <button class="btn btn-danger btn-sm" onclick="deleteJob('${namespace}', '${job.name}', '${cronjobName}')">Delete</button>
                    </td>
                </tr>
            `);
            jobsBody.append(jobRow);
        });
        jobsTable.append(jobsBody);
        $('#jobsModalBody').html(jobsTable);
        $('#jobsModal').modal('show');
    }).fail(function() {
        console.error('Failed to fetch jobs');
    });
}

function deleteJob(namespace, jobName, cronjobName) {
    $.ajax({
        url: `/delete-job/${namespace}/${jobName}`,
        type: 'DELETE',
        success: function(response) {
            alert('Job and associated pods deleted successfully');
            fetchCronJobJobs(namespace, cronjobName); // Refresh the list of jobs
        },
        error: function(error) {
            alert('Error deleting job and associated pods');
        }
    });
}

function showEditCronJobModal(namespace, cronjobName, currentSchedule) {
    $('#cronJobSchedule').val(currentSchedule);
    $('#editCronJobForm').off('submit').on('submit', function(event) {
        event.preventDefault();
        const newSchedule = $('#cronJobSchedule').val();
        editCronJobSchedule(namespace, cronjobName, newSchedule);
    });
    $('#editCronJobModal').modal('show');
}

function editCronJobSchedule(namespace, cronjobName, newSchedule) {
    $.ajax({
        url: `/edit-cronjob/${namespace}/${cronjobName}`,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ schedule: newSchedule }),
        success: function(response) {
            alert('CronJob schedule updated successfully');
            $('#editCronJobModal').modal('hide');
            fetchResources(namespace);
        },
        error: function(error) {
            alert('Error updating CronJob schedule');
        }
    });
}

function deletePod(namespace, podName) {
    $('.loading-spinner').show(); // Show loading spinner
    $.ajax({
        url: `/delete-pod/${namespace}/${podName}`,
        type: 'DELETE',
        success: function(response) {
            alert('Pod deleted successfully');
            fetchAllPods(namespace); // Refresh the list of pods
            $('.loading-spinner').hide(); // Hide loading spinner
        },
        error: function(error) {
            alert('Error deleting pod');
            $('.loading-spinner').hide(); // Hide loading spinner
        }
    });
}
