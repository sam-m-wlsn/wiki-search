'use strict';

const wikiSDK = (function () {
    // configs
    const apiBase = 'https://en.wikipedia.org/w/api.php';

    function getSearchURL(query, options) {
        const parameters = [
            apiBase,
            '?action=query',
            '&origin=*',
            '&format=json',
            '&list=search',
            '&srsearch='
        ];

        if ('filter' in options && query.length > 0) {
            parameters.push(options.filter + ':');
        }

        parameters.push(query);

        if('batchSize' in options) {
            parameters.push('&srlimit=');
            parameters.push(options.batchSize);
        }

        if('srsort' in options) {
            parameters.push('&srsort=');
            parameters.push(options.srsort);
        }

        if('sroffset' in options) {
            parameters.push('&sroffset=');
            parameters.push(options.sroffset);
        }

        return parameters.join('');
    }

    function searchShim(query, callback, options) {
        if(query === '') {
            callback(false, getErrorMessage('nosrsearch'));
            return false;
        }
        const request = new XMLHttpRequest();

        request.open('GET', getSearchURL(query, options), true);
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

    // creates method to update pagination
    const setPagination = (function() {
        const infoBar = document.getElementById('info');

        const next = document.createElement('a');
        next.innerText = 'Next';
        next.className = 'pagination-next';
        next.id = 'nextPage';

        const prev = document.createElement('a');
        prev.innerText = 'Prev';
        prev.className = 'pagination-prev';
        prev.id = 'prevPage';

        const pagination = document.createElement('div');
        pagination.className = 'pagination';
        pagination.id = 'pagination';

        const total = document.createElement('span');
        total.className = 'pagination-total';

        const divider = document.createTextNode('/');

        const current = document.createElement('span');
        current.className = 'pagination-current';

        pagination.appendChild(current);
        pagination.appendChild(divider);
        pagination.appendChild(total);

        pagination.appendChild(prev);
        pagination.appendChild(next);
        infoBar.appendChild(pagination);

        return function(batchSize, currentIndex, totalHits) {
            const totalPages = Math.ceil(totalHits / batchSize);
            const currentPage = Math.floor(currentIndex / batchSize);
            
            pagination.setAttribute('data-index', currentIndex);
            total.innerText = totalPages;
            current.innerText = currentPage;

            if(currentIndex <= batchSize) prev.classList.add('hidden');
            else prev.classList.remove('hidden');

            if (currentIndex >= totalHits) next.classList.add('hidden');
            else next.classList.remove('hidden');
            
            if (totalHits && totalHits !== 0) infoBar.classList.remove('hidden');
            else infoBar.classList.add('hidden');
        }
    })();


    const form = document.getElementById('wikiSearch');

    // search form functionality
    function submitSearch(event, index) {
        event.preventDefault();
        event.stopPropagation();

        const searchQuery = document.getElementById('searchQuery').value;
        const options = {
            batchSize: document.getElementById('batchSize').value,
            filter: document.getElementById('searchType').value,
            srsort: document.getElementById('sort').value
        };
        if(index) options.sroffset = index;

        wikiSDK.search(searchQuery, function(success, response) {
            let content;
            if (!success) {
                content = response;
            } else if (response.query.searchinfo.totalhits === 0) {
                setPagination(0, 0, 0);
                content = '<p>Sorry, no results were found</p>';
            } else {
                setPagination(parseInt(options.batchSize), parseInt(response.continue.sroffset), parseInt(response.query.searchinfo.totalhits));
                content = response.query.search.map(createSearchItem).join('');
            }

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
    }

    form.addEventListener('submit', submitSearch);
    const searchTriggers = [
        document.getElementById('searchType'),
        document.getElementById('batchSize'),
        document.getElementById('sort')
    ];

    searchTriggers.forEach(function(item) {
        item.addEventListener('change', submitSearch);
    });

    const next = document.getElementById('nextPage');
    const prev = document.getElementById('prevPage');
    next.addEventListener('click', function (event) { changePage(event, true) });
    prev.addEventListener('click', function (event) { changePage(event, false) });

    function changePage(event, forward) {
        const pagination = document.getElementById('pagination');
        let index = parseInt(pagination.getAttribute('data-index'));
        const batchSize = parseInt(document.getElementById('batchSize').value);

        if(!forward) index = index - (batchSize*2);
        
        submitSearch(event, index);
    }

    // default text on page load
    render('<p>Welcome! Please enter your search query in the field above to search en.wikipedia.org</p>');

})();
