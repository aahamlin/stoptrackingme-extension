const services = {
    "categories": {
        "Advertising": [
            {
                "2leep.com": {
                    "http://2leep.com/": [
                        "2leep.com"
                    ]
                }
            }
        ],
        "Content": [
            {
                "33Across": {
                    "http://33across.com/": [
                        "tynt.com"
                    ]
                }
            },
            {
                "ActivEngage": {
                    "http://www.activengage.com/": [
                        "activengage.com"
                    ]
                }
            },
        ],
        "Analytics": [
            {
                "63 Squares": {
                    "http://63squares.com/": [
                        "63squares.com",
                        "i-stats.com"
                    ]
                }
            },
        ],
        "Social": [
            {
                "AddThis": {
                    "http://www.addthis.com/": [
                        "addthis.com",
                        "addthiscdn.com",
                        "addthisedge.com",
                        "clearspring.com",
                        "connectedads.net",
                        "xgraph.com",
                        "xgraph.net"
                    ]
                }
            },
        ]
    }
};


const config = {
    trackers: {
        '63squares.com': {
            category: 'Analytics',
            name: '63 Squares',
            url: 'http://63squares.com'
        },
        'activeengage.com': {
            category: 'Content',
            name: 'ActiveEngage',
            url: 'http://www.activeengage.com'
        },
        'tracker.somewhere.com': {
            category: 'Fingerprinting',
            name: 'Somewhere Fake',
            url: 'http://www.somewhere.com'
        }
    }
};

export default {
    services: services,
    config: config
};
