'use strict';

const wikiSDK = (function () {
    // configs
    const apiBase = 'https://en.wikipedia.org/w/api.php';

    function searchURL(query, options) {
        const parameters = [
            apiBase,
            '?action=query',
            '&origin=*',
            '&format=json',
            '&list=search',
            '&srsearch='
        ];

        if ('filter' in options) {
            parameters.push(options.filter + ':');
        }
        
        parameters.push(query);

        if('batchSize' in options) {
            parameters.push('&srlimit=');
            parameters.push(options.batchSize);
        }

        return parameters.join('');
    }

    function searchShim(query, callback, options) {
        const request = new XMLHttpRequest();

        request.open('GET', searchURL(query, options), true);
        request.onload = function () {
            if (request.status >= 200 && request.status < 400) {
                const responseJSON = JSON.parse(request.responseText);
                if('error' in responseJSON) {
                    callback(false, getErrorMessage(responseJSON.error.code));
                } else {
                    callback(true, responseJSON);
                }
            } else {
                callback(false, getErrorMessage('HTTP ' + request.status));
            }
        }
        request.onerror = function () {
            callback(false, getErrorMessage('Ajax failed'));
        }
        request.send();
    }

    function getErrorMessage(responseCode) {
        switch(responseCode) {
            case 'nosrsearch':
                return 'Search Parameter cannot be empty';
            default:
                return 'We\re Sorry, an error was encountered while attempting to get your request. Error code: ' + responseCode;
        }
    }

    return {
        search: searchShim
    };
})();

(function(){
    // creates method to write content to DOM
    const render = (function() {
        const container = document.getElementById('response');

        return function(content) {
            container.innerHTML = content;
        }
    })();

    // search form functionality
    const form = document.getElementById('wikiSearch');
    form.addEventListener('submit', function(event){
        event.preventDefault();
        event.stopPropagation();

        const searchQuery = event.target.elements['search'].value;
        const options = {
            batchSize: document.getElementById('batchSize').value,
            filter: document.getElementById('searchType').value
        };
        
        wikiSDK.search(searchQuery, function(success, response){
            const content = success 
                ? response.query.search.map(createSearchItem).join('') 
                : response;
            render(content);
        }, options);

        function createSearchItem(entry) {
            const item = document.createElement('article');
            item.className = 'result';

            const title = document.createElement('h2');
            title.className = 'result-title';
            title.innerText = entry.title;

            const description = document.createElement('p');
            description.className = 'result-description';
            description.innerHTML = entry.snippet;

            item.appendChild(title);
            item.appendChild(description);

            return item.outerHTML;
        }

        return false;
    });
    

    // default text on page load
    render('Lorem ipsum dolor, sit amet consectetur adipisicing elit.');

})();