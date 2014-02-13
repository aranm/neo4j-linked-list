var async = require('async');
var simpleneo4js = require('simpleneo4js');

describe('Insert into a linked list in parallel', function () {

    beforeEach(function (done) {
        async.series([
            //delete every node in the database
            function (callback){
                simpleneo4js.query({
                    cypherQuery: 'MATCH (n) OPTIONAL MATCH (n)-[r]-() DELETE n,r',
                    parameters: {},
                    callback: callback
                });
            },
            function (callback){
                simpleneo4js.query({
                    cypherQuery: 'CREATE CONSTRAINT ON (h:HEAD) ASSERT h.list IS UNIQUE',
                    parameters: {},
                    callback: callback
                });
            },
            //create the root node of our linked list
            function (callback){
                simpleneo4js.query({
                    cypherQuery: 'CREATE (headNode:HEAD)-[:LINK]->(headNode)',
                    parameters: {},
                    callback: callback
                });
            }
        ], done)
    });


    it('add a lot of items into the linked list in parallel', function(done){

        var nodesToInsert = [];

        for (var i = 0; i < 200; i++){
            nodesToInsert.push(i);
        }

        var insertionQuery = "" +
        'MATCH (headNode:HEAD)-[old:LINK]->after ' +
        'REMOVE headNode._lock_ ' +
        'REMOVE after._lock_ ' +
        'DELETE old ' +
        'CREATE headNode-[:LINK]->(newNode:LINKNODE { number : {nodeNumber} })-[:LINK]->after ' +
        'RETURN headNode, newNode';

        //we fire off the async map function, this will hit our server once
        //for every node in the array
        async.map(nodesToInsert, function(item, callback){
            simpleneo4js.query({
                cypherQuery: insertionQuery,
                parameters: { nodeNumber: item },
                callback: callback,
                retryOn: "All",
                retryCount: 2
            });
        }, function(err, results){
            // results is now an array of the return values (which is null) but we should not have any errors
            done(err);
        });
    })
});