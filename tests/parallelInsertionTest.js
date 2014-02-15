var async = require('async');
var simpleneo4js = require('simpleneo4js');
var chai = require('chai');
var assert = chai.assert;


function runTestOnInsertionWith(numberOfNodes, numberOfRetries){
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
            //create the root node of our linked list
            function (callback){
                simpleneo4js.query({
                    cypherQuery: 'MERGE (headNode:HEAD)-[:LINK]->(headNode)',
                    parameters: {},
                    callback: callback
                });
            }
        ], done)
    });


    it('add a lot of items into the linked list in parallel', function(done){

        var nodesToInsert = [];

        for (var i = 0; i < numberOfNodes; i++){
            nodesToInsert.push(i);
        }

        var insertionQuery = "" +
            'MERGE (headNode:HEAD)-[old:LINK]->after ' +
            'REMOVE headNode._lock_ ' +
            'REMOVE after._lock_ ' +
            'REMOVE old._lock_ ' +
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
                retryCount: numberOfRetries
            });
        }, function(err){
            if (err){
                done(err);
            }
            else{
                var getDetailsQuery = '' +
                    'MATCH (headNode:HEAD) ' +
                    'MATCH headNode-[following:LINK*]->lastFollowing ' +
                    'WHERE lastFollowing <> headNode ' +
                    'RETURN COUNT(following) as following'

                simpleneo4js.query({
                    cypherQuery: getDetailsQuery,
                    parameters: {},
                    callback: function (error, results){
                        assert.equal(results.following, numberOfNodes, "Should be following " + numberOfNodes + " is following " + results.following);
                        if (error){
                            console.log(error);
                        }
                        done(error)
                    },
                    retryOn: "All",
                    retryCount: 1
                })
            }
        });
    })
};

describe('Insert items into a linked list in parallel', function () {
    describe('Insert 50 items into a liked list in parallel', function (){
        runTestOnInsertionWith(50, 1);
    })
    describe('Insert 100 items into a liked list in parallel', function (){
        runTestOnInsertionWith(100, 2);
    })
    describe('Insert 200 items into a liked list in parallel', function (){
        runTestOnInsertionWith(200, 3);
    })
    describe('Insert 300 items into a liked list in parallel', function (){
        runTestOnInsertionWith(300, 3);
    })
    describe('Insert 400 items into a liked list in parallel', function (){
        runTestOnInsertionWith(400, 4);
    })
});