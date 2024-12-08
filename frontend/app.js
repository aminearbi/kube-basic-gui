$(document).ready(function() {
    // Fetch namespaces and populate the sidebar
    fetchNamespaces();

    function fetchNamespaces() {
        $.get('/namespaces', function(data) {
            console.log('Namespaces:', data);
            const namespaces = data.namespaces;
            const namespacesList = $('#namespaces');
            namespacesList.empty();
            namespaces.forEach(namespace => {
                const listItem = $('<li class="list-group-item"></li>').text(namespace);
                listItem.click(function() {
                    fetchResources(namespace);
                });
                namespacesList.append(listItem);
            });
        }).fail(function() {
            console.error('Failed to fetch namespaces');
        });
    }

    function fetchResources(namespace) {
        $('#resources').empty();
        fetchStatefulSets(namespace);
        fetchDeployments(namespace);
    }

    function fetchStatefulSets(namespace) {
        $.get(`/statefulsets/${namespace}`, function(data) {
            console.log('StatefulSets:', data);
            const statefulsets = data.statefulsets;
            const statefulsetsContainer = $('<div></div>').append('<h5>StatefulSets</h5>');
            statefulsets.forEach(ss => {
                const statefulsetItem = $(`
                    <div class="card mb-3">
                        <div class="card-body">
                            <h5 class="card-title">${ss.name}</h5>
                            <p class="card-text">Replicas: ${ss.replicas}</p>
                            <button class="btn btn-primary" onclick="scaleStatefulSet('${namespace}', '${ss.name}', ${ss.replicas})">Scale</button>
                            ${ss.replicas > 0 ? `<button class="btn btn-secondary" onclick="fetchStatefulSetPods('${namespace}', '${ss.name}')">View Pods</button>` : ''}
                        </div>
                    </div>
                `);
                statefulsetsContainer.append(statefulsetItem);
            });
            $('#resources').append(statefulsetsContainer);
        }).fail(function() {
            console.error('Failed to fetch statefulsets');
        });
    }

    function fetchDeployments(namespace) {
        $.get(`/deployments/${namespace}`, function(data) {
            console.log('Deployments:', data);
            const deployments = data.deployments;
            const deploymentsContainer = $('<div></div>').append('<h5>Deployments</h5>');
            deployments.forEach(dp => {
                const deploymentItem = $(`
                    <div class="card mb-3">
                        <div class="card-body">
                            <h5 class="card-title">${dp.name}</h5>
                            <p class="card-text">Replicas: ${dp.replicas}</p>
                            <button class="btn btn-primary" onclick="scaleDeployment('${namespace}', '${dp.name}', ${dp.replicas})">Scale</button>
                            ${dp.replicas > 0 ? `<button class="btn btn-secondary" onclick="fetchDeploymentPods('${namespace}', '${dp.name}')">View Pods</button>` : ''}
                        </div>
                    </div>
                `);
                deploymentsContainer.append(deploymentItem);
            });
            $('#resources').append(deploymentsContainer);
        }).fail(function() {
            console.error('Failed to fetch deployments');
        });
    }

    window.scaleStatefulSet = function(namespace, name, replicas) {
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
    };

    window.scaleDeployment = function(namespace, name, replicas) {
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
    };

    window.fetchStatefulSetPods = function(namespace, statefulsetName) {
        $.get(`/statefulset-pods/${namespace}/${statefulsetName}`, function(data) {
            console.log('StatefulSet Pods:', data);
            const pods = data.pods;
            const podsContainer = $('<div></div>').append(`<h5>Pods for StatefulSet: ${statefulsetName}</h5>`);
            pods.forEach(pod => {
                const podItem = $(`
                    <div class="card mb-3">
                        <div class="card-body">
                            <h5 class="card-title">${pod.name}</h5>
                            <p class="card-text">Status: ${pod.status}</p>
                        </div>
                    </div>
                `);
                podsContainer.append(podItem);
            });
            $('#resources').append(podsContainer);
        }).fail(function() {
            console.error('Failed to fetch statefulset pods');
        });
    };

    window.fetchDeploymentPods = function(namespace, deploymentName) {
        $.get(`/deployment-pods/${namespace}/${deploymentName}`, function(data) {
            console.log('Deployment Pods:', data);
            const pods = data.pods;
            const podsContainer = $('<div></div>').append(`<h5>Pods for Deployment: ${deploymentName}</h5>`);
            pods.forEach(pod => {
                const podItem = $(`
                    <div class="card mb-3">
                        <div class="card-body">
                            <h5 class="card-title">${pod.name}</h5>
                            <p class="card-text">Status: ${pod.status}</p>
                        </div>
                    </div>
                `);
                podsContainer.append(podItem);
            });
            $('#resources').append(podsContainer);
        }).fail(function() {
            console.error('Failed to fetch deployment pods');
        });
    };
});
