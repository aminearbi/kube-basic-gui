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
        url: `/delete-pod/${namespace}/${name}`,
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
    const [minute, hour, dayOfMonth, month, dayOfWeek] = schedule.split(' ');
    $('#cronJobMinute').val(minute);
    $('#cronJobHour').val(hour);
    $('#cronJobDayOfMonth').val(dayOfMonth);
    $('#cronJobMonth').val(month);
    $('#cronJobDayOfWeek').val(dayOfWeek);
    $('#cronJobExpression').val(schedule);
    $('#editCronJobModal').modal('show');

    $('#editCronJobForm input').on('input', function () {
        const newSchedule = `${$('#cronJobMinute').val()} ${$('#cronJobHour').val()} ${$('#cronJobDayOfMonth').val()} ${$('#cronJobMonth').val()} ${$('#cronJobDayOfWeek').val()}`;
        $('#cronJobExpression').val(newSchedule);
    });

    $('#editCronJobForm').off('submit').on('submit', function (event) {
        event.preventDefault();
        const newSchedule = $('#cronJobExpression').val();
        if (validateCronFields()) {
            $('#updateButton').prop('disabled', true);
            $('#loadingSpinner').show();
            editCronJobSchedule(namespace, name, newSchedule);
        } else {
            showAlert('Invalid cron expression', 'danger');
        }
    });
}

function validateCronFields() {
    let isValid = true;

    const minute = $('#cronJobMinute').val();
    const hour = $('#cronJobHour').val();
    const dayOfMonth = $('#cronJobDayOfMonth').val();
    const month = $('#cronJobMonth').val();
    const dayOfWeek = $('#cronJobDayOfWeek').val();

    if (!/^(\*|([0-5]?\d)|([0-5]?\d-\d+)|(\d+(,\d+)*))$/.test(minute)) {
        $('#cronJobMinute').addClass('is-invalid');
        isValid = false;
    } else {
        $('#cronJobMinute').removeClass('is-invalid');
    }

    if (!/^(\*|([01]?\d|2[0-3])|([01]?\d-\d+)|(\d+(,\d+)*))$/.test(hour)) {
        $('#cronJobHour').addClass('is-invalid');
        isValid = false;
    } else {
        $('#cronJobHour').removeClass('is-invalid');
    }

    if (!/^(\*|([1-9]|[12]\d|3[01])|([1-9]-\d+)|(\d+(,\d+)*))$/.test(dayOfMonth)) {
        $('#cronJobDayOfMonth').addClass('is-invalid');
        isValid = false;
    } else {
        $('#cronJobDayOfMonth').removeClass('is-invalid');
    }

    if (!/^(\*|([1-9]|1[0-2])|([1-9]-\d+)|(\d+(,\d+)*))$/.test(month)) {
        $('#cronJobMonth').addClass('is-invalid');
        isValid = false;
    } else {
        $('#cronJobMonth').removeClass('is-invalid');
    }

    if (!/^(\*|([0-6])|([0-6]-\d+)|(\d+(,\d+)*))$/.test(dayOfWeek)) {
        $('#cronJobDayOfWeek').addClass('is-invalid');
        isValid = false;
    } else {
        $('#cronJobDayOfWeek').removeClass('is-invalid');
    }

    return isValid;
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

function isValidCronExpression(cronExpression) {
    // Improved regex for cron expression validation
    const cronRegex = /^(\*|([0-5]?\d)|([0-5]?\d-\d+)|(\d+(,\d+)*)) (\*|([01]?\d|2[0-3])|([01]?\d-\d+)|(\d+(,\d+)*)) (\*|([1-9]|[12]\d|3[01])|([1-9]-\d+)|(\d+(,\d+)*)) (\*|([1-9]|1[0-2])|([1-9]-\d+)|(\d+(,\d+)*)) (\*|([0-6])|([0-6]-\d+)|(\d+(,\d+)*))$/;
    return cronRegex.test(cronExpression);
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
                    <tr>
                        <td>${job.name}</td>
                        <td>${job.status}</td>
                        <td>${job.age} minutes</td>
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
        // Wait for 3 seconds before refreshing the related jobs list
        setTimeout(() => {
            const cronjobName = $('#relatedJobsModal').data('cronjob-name');
            showRelatedJobs(namespace, cronjobName);
        }, 3000);
    })
    .catch(error => {
        showAlert(`Error deleting job "${jobName}"`, 'danger');
        console.error('Error deleting job:', error);
    });
}
