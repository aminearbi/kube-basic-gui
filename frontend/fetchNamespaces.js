$(document).ready(function() {
    fetchNamespaces();
    $('#namespaceSearch').on('input', function() {
        filterNamespaces();
    });
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
                onNamespaceClick(namespace);
            });
            namespacesList.append(listItem);
        });
    }).fail(function() {
        console.error('Failed to fetch namespaces');
    });
}


function filterNamespaces() {
    const searchValue = $('#namespaceSearch').val().toLowerCase();
    $('#namespaces li').each(function() {
        const namespace = $(this).text().toLowerCase();
        if (namespace.includes(searchValue)) {
            $(this).show();
        } else {
            $(this).hide();
        }
    });
}


function getNamespace() {
    return localStorage.getItem('selectedNamespace') || 'default';
}

function onNamespaceClick(namespace) {
    updateNamespaceDisplay(namespace);
    fetchResources();
}