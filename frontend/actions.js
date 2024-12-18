function showAlert(message, type) {
    const alert = $(`
        <div class="alert alert-${type} alert-dismissible fade show custom-alert" role="alert">
            ${message}
            <button type="button" class="close" data-dismiss="alert" aria-label=-"Close">
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

// =============== Pod Operations ===============
function deletePod(namespace, name) {
    $.ajax({
        url: `/delete-pod/${namespace}/${name}`,
        type: 'DELETE',
        success: function(response) {
            showAlert(`Pod "${name}" deleted successfully`, 'success');
            fetchResources(namespace);
        },
        error: function(error) {
            showAlert(`Error deleting pod "${name}"`, 'danger');
        }
    });
}

function showEditCronJobModal(namespace, name, schedule) {
    updateNamespaceDisplay(namespace);
    const [minute, hour, dayOfMonth, month, dayOfWeek] = schedule.split(' ');
    
    $('#editCronJobModalLabel').text(`Edit CronJob Schedule for ${name}`);
    $('#cronJobMinute').val(minute);
    $('#cronJobHour').val(hour);
    $('#cronJobDayOfMonth').val(dayOfMonth);
    $('#cronJobMonth').val(month);
    $('#cronJobDayOfWeek').val(dayOfWeek);
    $('#cronJobExpression').val(schedule);
    
    $('#editCronJobModal').modal('show');

    // Handle real-time updates
    $('#editCronJobForm input').on('input', function() {
        const newSchedule = [
            $('#cronJobMinute').val(),
            $('#cronJobHour').val(),
            $('#cronJobDayOfMonth').val(),
            $('#cronJobMonth').val(),
            $('#cronJobDayOfWeek').val()
        ].join(' ');
        
        $('#cronJobExpression').val(newSchedule);
    });

    // Handle form submission
    $('#editCronJobForm').off('submit').on('submit', function(event) {
        event.preventDefault();
        const components = $('#cronJobExpression').val().split(' ');
        
        if (isValidCronExpression(components)) {
            $('#updateButton').prop('disabled', true);
            $('#loadingSpinner').show();
            editCronJobSchedule(namespace, name, components.join(' '));
        } else {
            showAlert('Invalid cron expression', 'danger');
        }
    });
}

// =============== CronJob Schedule Operations ===============
function validateScheduleComponent(value, min, max) {
    // Handle empty or invalid input
    if (!value || value.trim() === '') return false;

    // Handle asterisk
    if (value === '*') return true;

    // Handle steps (*/n)
    if (value.includes('/')) {
        const [range, step] = value.split('/');
        if (range !== '*' && !validateScheduleComponent(range, min, max)) return false;
        return parseInt(step) > 0;
    }

    // Handle ranges (n-m)
    if (value.includes('-')) {
        const [start, end] = value.split('-').map(Number);
        return start >= min && start <= end && end <= max;
    }

    // Handle lists (n,m,p)
    if (value.includes(',')) {
        return value.split(',').every(v => validateScheduleComponent(v, min, max));
    }

    // Handle single values
    const num = parseInt(value);
    return num >= min && num <= max;
}

function isValidCronExpression(components) {
    if (components.length !== 5) return false;

    return (
        validateScheduleComponent(components[0], 0, 59) && // minute
        validateScheduleComponent(components[1], 0, 23) && // hour
        validateScheduleComponent(components[2], 1, 31) && // day of month
        validateScheduleComponent(components[3], 1, 12) && // month
        validateScheduleComponent(components[4], 0, 6)     // day of week
    );
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
        },
        complete: function () {
            $('#updateButton').prop('disabled', false);
            $('#loadingSpinner').hide();
        }
    });
}

function createJobFromCronjob(namespace, cronjobName) {
    fetch(`/create-job-from-cronjob/${namespace}/${cronjobName}`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        showAlert(`Job "${data.job_name}" created from CronJob "${cronjobName}" successfully`, 'success');
        // Refresh the cronjob list or perform any other necessary actions
    })
    .catch(error => {
        showAlert(`Error creating job from CronJob "${cronjobName}"`, 'danger');
        console.error('Error creating job from CronJob:', error);
    });
}

function showRelatedJobs(namespace, cronjobName) {
    fetch(`/jobs/${namespace}/${cronjobName}`)
        .then(response => response.json())
        .then(data => {
            var relatedJobsList = $('#relatedJobsList');
            relatedJobsList.empty();
            data.jobs.forEach(job => {
                relatedJobsList.append(`
                    <tr id="job-${job.name}">
                        <td>${job.name}</td>
                        <td>${job.status}</td>
                        <td>${job.age} minutes</td>
                        <td>
                            <button class="btn btn-danger btn-sm" onclick="deleteJob('${namespace}', '${job.name}', '${cronjobName}')">Delete</button>
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

function deleteJob(namespace, jobName, cronjobName) {
    $.ajax({
        url: `/delete-job/${namespace}/${jobName}`,
        type: 'DELETE',
        success: function(response) {
            showAlert(`Job "${jobName}" deleted successfully`, 'success');
            $(`#job-${jobName}`).remove(); // Remove the job row from the table
        },
        error: function(error) {
            showAlert(`Error deleting job "${jobName}"`, 'danger');
        }
    });
}

