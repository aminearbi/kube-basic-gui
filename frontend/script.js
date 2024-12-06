function sendLogToBackend(log) {
    fetch('/log', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ log })
    })
    .then(response => response.json())
    .then(data => console.log('Log sent to backend:', data.message))
    .catch(error => console.error('Error sending log to backend:', error));
}

document.addEventListener('DOMContentLoaded', function() {
    fetchNamespaces();
    setInterval(fetchResourcesPeriodically, 5000); // Fetch resources every 5 seconds
});

function fetchNamespaces() {
    fetch('/namespaces')
        .then(response => response.json())
        .then(data => {
            const namespacesList = document.getElementById('namespaces');
            namespacesList.innerHTML = ''; // Clear existing list
            data.forEach(namespace => {
                const li = document.createElement('li');
                li.textContent = namespace;
                li.className = 'list-group-item list-group-item-action';
                li.addEventListener('click', () => fetchResources(namespace));
                namespacesList.appendChild(li);
            });
        })
        .catch(error => {
            console.error('Error fetching namespaces:', error);
            sendLogToBackend(`Error fetching namespaces: ${error}`);
        });
}

function fetchResources(namespace) {
    document.getElementById('selected-namespace').textContent = namespace;
    fetch(`/resources/${namespace}`)
        .then(response => response.json())
        .then(data => {
            console.log('Fetched resources:', data); // Log the fetched data
            sendLogToBackend(`Fetched resources: ${JSON.stringify(data)}`);
            const statefulsetsList = document.getElementById('statefulsets');
            const deploymentsList = document.getElementById('deployments');
            const servicesList = document.getElementById('services');
            const cronjobsList = document.getElementById('cronjobs');
            statefulsetsList.innerHTML = '';
            deploymentsList.innerHTML = '';
            servicesList.innerHTML = '';
            cronjobsList.innerHTML = '';

            data.statefulsets.forEach(ss => {
                const replicas = ss.replicas || 0;
                const readyReplicas = ss.readyReplicas || 0;
                const loading = replicas !== readyReplicas ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>' : '';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><a href="#" onclick="fetchPods('${namespace}', 'statefulset', '${ss.name}')">${ss.name}</a></td>
                    <td>${replicas} ${loading}</td>
                    <td>
                        <label class="switch">
                            <input type="checkbox" ${replicas > 0 ? 'checked' : ''} onchange="handleSwitchChange('${ss.name}', 'statefulset', this.checked)">
                            <span class="slider round"></span>
                        </label>
                    </td>
                `;
                statefulsetsList.appendChild(tr);
            });

            data.deployments.forEach(dp => {
                const replicas = dp.replicas || 0;
                const readyReplicas = dp.readyReplicas || 0;
                const loading = replicas !== readyReplicas ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>' : '';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><a href="#" onclick="fetchPods('${namespace}', 'deployment', '${dp.name}')">${dp.name}</a></td>
                    <td>${replicas} ${loading}</td>
                    <td>
                        <label class="switch">
                            <input type="checkbox" ${replicas > 0 ? 'checked' : ''} onchange="handleSwitchChange('${dp.name}', 'deployment', this.checked)">
                            <span class="slider round"></span>
                        </label>
                    </td>
                `;
                deploymentsList.appendChild(tr);
            });

            data.services.forEach(svc => {
                const ports = svc.ports.map(p => `${p.port}/${p.protocol}`).join(', ');
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${svc.name}</td>
                    <td>${svc.type}</td>
                    <td>${svc.clusterIP}</td>
                    <td>${ports}</td>
                `;
                servicesList.appendChild(tr);
            });

            data.cronjobs.forEach(cj => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><a href="#" onclick="fetchJobs('${namespace}', '${cj.name}')">${cj.name}</a></td>
                    <td>
                        <span id="schedule-${cj.name}">${cronToHumanReadable(cj.schedule)}</span>
                        <button class="btn btn-secondary btn-sm" onclick="editCronJob('${namespace}', '${cj.name}', '${cj.schedule}')">Edit</button>
                    </td>
                    <td>
                        <button class="btn btn-primary" onclick="fetchJobs('${namespace}', '${cj.name}')">View Jobs</button>
                    </td>
                `;
                cronjobsList.appendChild(tr);
            });
        })
        .catch(error => {
            console.error('Error fetching resources:', error);
            sendLogToBackend(`Error fetching resources: ${error}`);
        });
}

function cronToHumanReadable(cron) {
    const parts = cron.split(' ');
    const minute = parts[0];
    const hour = parts[1];
    const dayOfMonth = parts[2];
    const month = parts[3];
    const dayOfWeek = parts[4];

    const humanReadable = `At ${minute} minute(s) past ${hour} hour(s) on day ${dayOfMonth} of month ${month}, on ${dayOfWeek}`;
    return humanReadable;
}

function humanReadableToCron(humanReadable) {
    const parts = humanReadable.split(' ');
    const minute = parts[1];
    const hour = parts[5];
    const dayOfMonth = parts[9];
    const month = parts[13];
    const dayOfWeek = parts[16];

    const cron = `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
    return cron;
}

function editCronJob(namespace, cronJobName, currentSchedule) {
    $('#editCronJobModal').modal('show');
    document.getElementById('cronJobSchedule').value = cronToHumanReadable(currentSchedule);
    document.getElementById('editCronJobForm').onsubmit = function(event) {
        event.preventDefault();
        const newSchedule = humanReadableToCron(document.getElementById('cronJobSchedule').value);
        updateCronJob(namespace, cronJobName, newSchedule);
    };
}

function updateCronJob(namespace, cronJobName, newSchedule) {
    fetch(`/update-cronjob`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ namespace, cronJobName, newSchedule })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
        sendLogToBackend(`Updated CronJob ${cronJobName} in ${namespace} to schedule ${newSchedule}`);
        document.getElementById(`schedule-${cronJobName}`).textContent = cronToHumanReadable(newSchedule);
        $('#editCronJobModal').modal('hide');
    })
    .catch(error => {
        console.error('Error updating CronJob:', error);
        sendLogToBackend(`Error updating CronJob: ${error}`);
    });
}

function fetchJobs(namespace, cronJobName) {
    fetch(`/jobs/${namespace}/${cronJobName}`)
        .then(response => response.json())
        .then(data => {
            const jobsList = document.getElementById('jobsList');
            jobsList.innerHTML = ''; // Clear existing list
            data.forEach(job => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${job.name}</td>
                    <td>${job.status}</td>
                    <td>${job.age}</td>
                    <td>
                        <button class="btn btn-danger" onclick="terminateJob('${namespace}', '${job.name}', '${cronJobName}')">Terminate</button>
                    </td>
                `;
                jobsList.appendChild(tr);
            });
            $('#jobsModal').modal('show');
        })
        .catch(error => {
            console.error('Error fetching jobs:', error);
            sendLogToBackend(`Error fetching jobs: ${error}`);
        });
}

function terminateJob(namespace, jobName, cronJobName) {
    fetch(`/terminate-job`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ namespace, jobName })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
        sendLogToBackend(`Terminated job ${jobName} in ${namespace}`);
        fetchJobs(namespace, cronJobName); // Refresh the jobs list
    })
    .catch(error => {
        console.error('Error terminating job:', error);
        sendLogToBackend(`Error terminating job: ${error}`);
    });
}


function editCronJob(namespace, cronJobName, currentSchedule) {
    $('#editCronJobModal').modal('show');
    document.getElementById('cronJobSchedule').value = currentSchedule;
    document.getElementById('editCronJobForm').onsubmit = function(event) {
        event.preventDefault();
        const newSchedule = document.getElementById('cronJobSchedule').value;
        updateCronJob(namespace, cronJobName, newSchedule);
    };
}

function updateCronJob(namespace, cronJobName, newSchedule) {
    fetch(`/update-cronjob`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ namespace, cronJobName, newSchedule })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
        sendLogToBackend(`Updated CronJob ${cronJobName} in ${namespace} to schedule ${newSchedule}`);
        document.getElementById(`schedule-${cronJobName}`).textContent = newSchedule;
        $('#editCronJobModal').modal('hide');
    })
    .catch(error => {
        console.error('Error updating CronJob:', error);
        sendLogToBackend(`Error updating CronJob: ${error}`);
    });
}


function fetchResourcesPeriodically() {
    const namespace = document.getElementById('selected-namespace').textContent;
    if (namespace) {
        fetchResources(namespace);
    }
}

function handleSwitchChange(name, resourceType, checked) {
    if (checked) {
        $('#replicaModal').modal('show');
        document.getElementById('replicaForm').onsubmit = function(event) {
            event.preventDefault();
            const replicas = parseInt(document.getElementById('replicaCount').value, 10);
            if (replicas < 0 || replicas > 10) {
                alert('Please enter a value between 0 and 10.');
                return;
            }
            const namespace = document.getElementById('selected-namespace').textContent;
            console.log(`Scaling ${resourceType} ${name} in ${namespace} to ${replicas} replicas`);
            sendLogToBackend(`Scaling ${resourceType} ${name} in ${namespace} to ${replicas} replicas`);
            fetch('/scale', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ namespace, resource_type: resourceType, name, replicas })
            })
            .then(response => response.json())
            .then(data => {
                console.log(data.message);
                sendLogToBackend(`Scale response: ${data.message}`);
                fetchResources(namespace);
                $('#replicaModal').modal('hide');
            })
            .catch(error => {
                console.error('Error scaling resource:', error);
                sendLogToBackend(`Error scaling resource: ${error}`);
            });
        };
    } else {
        const replicas = 0;
        const namespace = document.getElementById('selected-namespace').textContent;
        console.log(`Scaling ${resourceType} ${name} in ${namespace} to ${replicas} replicas`);
        sendLogToBackend(`Scaling ${resourceType} ${name} in ${namespace} to ${replicas} replicas`);
        fetch('/scale', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ namespace, resource_type: resourceType, name, replicas })
        })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);
            sendLogToBackend(`Scale response: ${data.message}`);
            fetchResources(namespace);
        })
        .catch(error => {
            console.error('Error scaling resource:', error);
            sendLogToBackend(`Error scaling resource: ${error}`);
        });
    }
}

function fetchPods(namespace, resourceType, resourceName) {
    fetch(`/pods/${namespace}/${resourceType}/${resourceName}`)
        .then(response => response.json())
        .then(data => {
            const podsList = document.getElementById('podsList');
            podsList.innerHTML = ''; // Clear existing list
            data.forEach(pod => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${pod.name}</td>
                    <td>${pod.status}</td>
                    <td>${pod.age}</td>
                    <td><a href="#" onclick="fetchPodLogs('${namespace}', '${pod.name}')">Logs</a></td>
                `;
                podsList.appendChild(tr);
            });
            $('#podsModal').modal('show');
        })
        .catch(error => {
            console.error('Error fetching pods:', error);
            sendLogToBackend(`Error fetching pods: ${error}`);
        });
}

let logInterval;

function fetchPodLogs(namespace, podName) {
    clearInterval(logInterval); // Clear any existing interval
    $('#logsModal').modal('show');
    logInterval = setInterval(() => {
        fetch(`/logs/${namespace}/${podName}`)
            .then(response => response.json())
            .then(data => {
                const podLogs = document.getElementById('podLogs');
                podLogs.innerHTML = ''; // Clear existing logs
                const logLines = data.logs.split('\n');
                logLines.forEach(line => {
                    const logEntry = document.createElement('div');
                    const dateTimeRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/;
                    const dateTimeMatch = line.match(dateTimeRegex);
                    if (dateTimeMatch) {
                        const dateTimeSpan = document.createElement('span');
                        dateTimeSpan.className = 'log-datetime';
                        dateTimeSpan.textContent = dateTimeMatch[0];
                        logEntry.appendChild(dateTimeSpan);
                        logEntry.appendChild(document.createTextNode(line.replace(dateTimeMatch[0], '')));
                    } else {
                        logEntry.textContent = line;
                    }
                    podLogs.appendChild(logEntry);
                });
            })
            .catch(error => {
                console.error('Error fetching pod logs:', error);
                sendLogToBackend(`Error fetching pod logs: ${error}`);
            });
    }, 1000); // Update logs every second
}

// Clear the interval when the logs modal is closed
$('#logsModal').on('hidden.bs.modal', function () {
    clearInterval(logInterval);
});
