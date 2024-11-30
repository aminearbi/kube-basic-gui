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
        .catch(error => console.error('Error fetching namespaces:', error));
}

function fetchResources(namespace) {
    document.getElementById('selected-namespace').textContent = namespace;
    fetch(`/resources/${namespace}`)
        .then(response => response.json())
        .then(data => {
            const statefulsetsList = document.getElementById('statefulsets');
            const deploymentsList = document.getElementById('deployments');
            statefulsetsList.innerHTML = '';
            deploymentsList.innerHTML = '';

            data.statefulsets.forEach(ss => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${ss.name}</td>
                    <td>${ss.replicas}</td>
                    <td>
                        <label class="switch">
                            <input type="checkbox" ${ss.replicas > 0 ? 'checked' : ''} onchange="handleSwitchChange('${ss.name}', 'statefulset', this.checked)">
                            <span class="slider round"></span>
                        </label>
                    </td>
                `;
                statefulsetsList.appendChild(tr);
            });

            data.deployments.forEach(dp => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${dp.name}</td>
                    <td>${dp.replicas}</td>
                    <td>
                        <label class="switch">
                            <input type="checkbox" ${dp.replicas > 0 ? 'checked' : ''} onchange="handleSwitchChange('${dp.name}', 'deployment', this.checked)">
                            <span class="slider round"></span>
                        </label>
                    </td>
                `;
                deploymentsList.appendChild(tr);
            });
        })
        .catch(error => console.error('Error fetching resources:', error));
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
            const namespace = document.getElementById('selected-namespace').textContent;
            console.log(`Scaling ${resourceType} ${name} in ${namespace} to ${replicas} replicas`);
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
                fetchResources(namespace);
                $('#replicaModal').modal('hide');
            })
            .catch(error => console.error('Error scaling resource:', error));
        };
    } else {
        const replicas = 0;
        const namespace = document.getElementById('selected-namespace').textContent;
        console.log(`Scaling ${resourceType} ${name} in ${namespace} to ${replicas} replicas`);
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
            fetchResources(namespace);
        })
        .catch(error => console.error('Error scaling resource:', error));
    }
}
