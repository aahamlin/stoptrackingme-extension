export default function(doc) {
    const trackers = {};

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
                        trackers[domains[j]] = {
                            category: catName,
                            name: serviceName,
                            url: siteName
                        };
                    }
                }
            }
        }

    }

    return {
        trackers: trackers
    };
}
