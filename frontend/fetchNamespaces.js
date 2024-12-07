$(document).ready(function() {
    fetchNamespaces();
});

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
