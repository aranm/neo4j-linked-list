var async = require('async');
var simpleneo4js = require('simpleneo4js');

describe('Insert into a linked list in parallel', function () {

    beforeEach(function (done) {
        async.series([
            //delete every node in the database
            function (callback){
                simpleneo4js.query('MATCH (n) OPTIONAL MATCH (n)-[r]-() DELETE n,r', {}, callback);
            },
            function (callback){
                simpleneo4js.query('CREATE CONSTRAINT ON (h:HEAD) ASSERT h.list IS UNIQUE', {}, callback);
            },
            //create the root node of our linked list
            function (callback){
                simpleneo4js.query('MERGE (headNode:HEAD {list:"mylist"}) WITH headNode MERGE headNode-[:LINK]->(headNode)', {}, callback)
            }
        ], done)
    });


    it('add a lot of items into the linked list in parallel', function(done){

        var nodesToInsert = [];

        for (var i = 0; i < 20; i++){
            nodesToInsert.push(i);
        }

        var insertionQuery = "" +
        'MERGE (headNode:HEAD {list:"mylist"})' +
        'WITH headNode ' +
        'MATCH (headNode)-[old:LINK]->after ' +
        'DELETE old ' +
        'CREATE headNode-[:LINK]->(newNode:LINKNODE { number : {nodeNumber} })-[:LINK]->after';

        //we fire off the async map function, this will hit our server once
        //for every node in the array
        async.map(nodesToInsert, function(item, callback){
            simpleneo4js.query(insertionQuery, { nodeNumber: item }, callback);
        }, function(err, results){
            // results is now an array of the return values (which is null) but we should not have any errors
            done(err);
        });
    })
});