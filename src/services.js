import browser from './browser.js';

/**
 * @param services - list of service definitions
 * @param servername - name of site, also called domain (see "opaque origin")
 * @return serviceId - property name to retrieve,
 */
export function lookup(services, servername) {
    if(!services || services.length) throw new Error('provide services object');
    if(!servername || typeof servername !== 'string') throw new Error('provide servername string');
    // how these map to service definitions:
    // key: twitter.jp => { url: https://twitter.com, category: string }
    // key: twitter.com => { url: https://twitter.com, category: string }

    // move from top-level domain backwards
    var index = servername.lastIndexOf('.'),
        key;

    do {
        index = servername.lastIndexOf('.', index-1);
        key = servername.substring(index+1);
        if (services.hasOwnProperty(key)) {
            return key;
        }
    } while (index > 0);

}

export function areEqual(service1, service2) {
    return (service1.name === service2.name
            && service1.url === service2.url
            && service1.category === service2.category);
}


/**
 * @return Promise resolves to @object containing tracking service definitions
 */

export function initTrackingServices() {
    const url = browser.extension.getURL('config/services.json');

    return new Promise((resolve, reject) =>{
        var xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(
            configureServices(
                JSON.parse(xhr.responseText)));
        xhr.onerror = () => reject(xhr.statusText);
        xhr.open('GET', url, true);
        xhr.send();
    });
}

/**
 * @param doc - JSON document
 * @return @object containing service definitions
 */
export function configureServices(doc) {
    const services = {};

    if(!doc.hasOwnProperty('categories')) {
        throw new Error('Invalid document');
    }
    let categories = doc.categories;
    for(let catName in categories) {
        let category = categories[catName];
        let categoryCount = category.length;
        for(let i = 0; i < categoryCount; i++) {
            let service = category[i];
            for(let serviceName in service) {
                let sites = service[serviceName];
                for(let siteName in sites) {
                    let domains = sites[siteName];
                    let domainsCount = domains.length;
                    for (let j = 0; j < domainsCount; j++) {
                        services[domains[j]] = {
                            category: catName,
                            name: serviceName,
                            url: siteName
                        };
                    }
                }
            }
        }
    }

    return services;
}
