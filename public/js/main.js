'use strict';

(function(){
    // configs
    const apiBase = 'https://en.wikipedia.org/w/api.php';
    const searchBase = [
        '?action=query',
        '&origin=*',
        '&format=json', 
        '&list=search', 
        '&srsearch='
    ].join('');

    // creates method to write content to DOM
    const write = (function() {
        const container = document.getElementById('response');

        return function(content) {
            container.innerHTML = content;
        }
    })();

    // vanilla js ajax shim
    function get(requestedUrl, success, fail) {
        const request = new XMLHttpRequest();

        request.open('GET', requestedUrl, true);
        request.onload = function() {
            if ( request.status >= 200 && request.status < 400) {
                success(JSON.parse(request.responseText));
            } else {
                fail();
            }
        }
        request.onerror = function() {
            fail();
        }
        request.send();
    }; 

    // takes control of search form
    const form = document.getElementById('wikiSearch');
    form.addEventListener('submit', function(event){
        event.preventDefault();
        event.stopPropagation();

        const searchQuery = event.target.elements['search'].value;
        const apiUrl = [apiBase, searchBase, searchQuery].join('');
        get(
            apiUrl, 
            function(response){
                if('error' in response) {
                    if (response.error.code === 'nosrsearch') write('No search query provided');
                    else write('We\'re sorry, an error was encountered retreiving the requested data.');
                } else {
                    const results = response.query.search.map(function(entry){
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
                    });

                    write(results.join(''));
                }
            }, function(){
                write('We\'re sorry, an error was encountered retreiving the requested data.');
            }
        );

        return false;
    });
    

    // default text on page load
    write('Lorem ipsum dolor, sit amet consectetur adipisicing elit.');

})();