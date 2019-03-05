'use strict';

// shim for accessing content from wiki API
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

    function getPageURL(pageID) {
        return [
            apiBase,
            '?action=parse',
            '&origin=*',
            '&pageid=',
            pageID,
            '&format=json'
        ].join('');
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

    function getPage(pageId, callback) {
        const request = new XMLHttpRequest();

        request.open('GET', getPageURL(pageId), true);
        request.onload = function () {
            if (request.status >= 200 && request.status < 400) {
                const responseJSON = JSON.parse(request.responseText);
                if ('error' in responseJSON) {
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
        search: searchShim,
        page: getPage
    };
})();

(function(){
    // creates method to write content to DOM
    const render = (function() {
        const container = document.getElementById('response');

        return function(content) {
            if(typeof content === "string") container.innerHTML = content;
            else {
                console.log(content);
                
                container.innerHTML = '';
                container.appendChild(content);
            }
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

    function openPage(event) {
        const pageId = event.currentTarget.getAttribute('data-page-id');
        wikiSDK.page(pageId, function(success, results){
            console.log(results);
            
            render(results.parse.text['*']);
        });
    }

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
                render(response);
            } else if (response.query.searchinfo.totalhits === 0) {
                setPagination(0, 0, 0);
                render('<p>Sorry, no results were found</p>');
            } else {
                setPagination(options.batchSize, response.continue.sroffset, response.query.searchinfo.totalhits));
                const docFragment = document.createDocumentFragment();
                const results = response.query.search.map(createSearchItem);
                results.forEach(function(item){ docFragment.appendChild(item)});
                render(docFragment);

                const cards = document.querySelectorAll('.result');
            }
        }, options);

        function createSearchItem(entry) {
            const href = document.createElement('a');
            href.className = 'result';
            href.addEventListener('click', openPage, true);
            href.setAttribute('data-page-id', entry.pageid);

            const item = document.createElement('article');

            const title = document.createElement('h2');
            title.className = 'result-title';
            title.innerText = entry.title;

            const description = document.createElement('p');
            description.className = 'result-description';
            description.innerHTML = entry.snippet;

            item.appendChild(title);
            item.appendChild(description);

            href.appendChild(item);

            return href;
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
