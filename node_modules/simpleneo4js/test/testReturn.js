/**
 * Created by Aran Mulholland on 30/01/2014.
 */

var chai = require('chai');
var assert = chai.assert;

var simpleNeo4js = require('../')
var cleanDatabase = require('./cleanDatabase');

describe('Testing returning values from cypher queries', function(){

    describe('Returning multiple nodes', function(){

        beforeEach(function(done){
            cleanDatabase.clean(done);
        })

        //first create two nodes
        beforeEach(function(done){
            var cypherQuery = 'CREATE (n:User {name: {name}, age: {age} })-[:has]->(b:Bicycle {make: {make} }) RETURN n';
            var queryParameters = {
                name: 'Billy Bob',
                age: 34,
                make: 'Malvern Star'
            };
            var queryResult = simpleNeo4js.query(cypherQuery, queryParameters);

            queryResult.on('data', function () {
                done();
            });

            queryResult.on('error', function (error) {
                done(error);
            });
        })

        beforeEach(function(done){
            var cypherQuery = 'CREATE (n:User {name: {name}, age: {age} })-[:has]->(b:Bicycle {make: {make} }) RETURN n';
            var queryParameters = {
                name: 'Johno Riso',
                age: 18,
                make: 'BMX'
            };
            var queryResult = simpleNeo4js.query(cypherQuery, queryParameters);

            queryResult.on('data', function () {
                done();
            });

            queryResult.on('error', function (error) {
                done(error);
            });
        })

        it('should return an array of key dictionary pairs', function(done){

            var cypherQuery = 'MATCH (n:User) RETURN n';
            var queryParameters = { };
            var queryResult = simpleNeo4js.query(cypherQuery, queryParameters);

            queryResult.on('data', function (newNodes) {
                assert.equal(newNodes.length, 2, 'Two nodes were returned');
                var names = newNodes.map(function (item) {
                    return item.n.name;
                });

                assert.ok(names.indexOf('Johno Riso') > -1, "Names returned contains John Riso");
                assert.ok(names.indexOf('Billy Bob') > -1, "Names returned contains Billy Bob");

                done();
            });

            queryResult.on('error', function (error) {
                done(error);
            });
        })

        it('should return an array of key value pairs with different types as requested by the return value', function(done){

            var cypherQuery = 'MATCH (n:User)-[:has]->(b:Bicycle) RETURN n, b';
            var queryParameters = { };
            var queryResult = simpleNeo4js.query(cypherQuery, queryParameters);

            queryResult.on('data', function (newNodes) {
                assert.equal(newNodes.length, 2, 'Two nodes were returned');

                var namesAndBikeMakes = newNodes.map(function (item) {
                    return item.n.name + " - " + item.b.make;
                });

                assert.ok(namesAndBikeMakes.indexOf('Johno Riso - BMX') > -1, "Names returned contains Johno Riso - BMX");
                assert.ok(namesAndBikeMakes.indexOf('Billy Bob - Malvern Star') > -1, "Names returned contains Billy Bob - Malvern Star");

                done();
            });

            queryResult.on('error', function (error) {
                done(error);
            });
        })

        it('should return an array of key value pairs with non standard property types', function(done){

            var cypherQuery = 'MATCH (n:User) RETURN n, n.age';
            var queryParameters = { };
            var queryResult = simpleNeo4js.query(cypherQuery, queryParameters);

            queryResult.on('data', function (newNodes) {

                var namesAndBikeMakes = newNodes.map(function (item) {
                    return item.n.name + " - " + item['n.age'];
                });

                assert.ok(namesAndBikeMakes.indexOf('Johno Riso - 18') > -1, "Names returned contains Johno Riso - 18");
                assert.ok(namesAndBikeMakes.indexOf('Billy Bob - 34') > -1, "Names returned contains Billy Bob - 34");

                done();
            });

            queryResult.on('error', function (error) {
                done(error);
            });
        })

        it('should return an array of key value pairs with non standard property types like Count(n)', function(done){

            var cypherQuery = 'MATCH (n:User) RETURN n, COUNT(n)';
            var queryParameters = { };
            var queryResult = simpleNeo4js.query(cypherQuery, queryParameters);

            queryResult.on('data', function (newNodes) {
                assert.equal(newNodes.length, 2, 'Two nodes were returned');

                var namesAndBikeMakes = newNodes.map(function (item) {
                    return item.n.name + " - " + item['COUNT(n)'];
                });

                assert.ok(namesAndBikeMakes.indexOf('Johno Riso - 1') > -1, "Names returned contains Johno Riso - 1");
                assert.ok(namesAndBikeMakes.indexOf('Billy Bob - 1') > -1, "Names returned contains Billy Bob - 1");

                done();
            });

            queryResult.on('error', function (error) {
                done(error);
            });
        })

        it('should return an array of key value pairs with non standard property types like Count(n) and n.age', function(done){

            var cypherQuery = 'MATCH (n:User) RETURN n, COUNT(n), n.age';
            var queryParameters = { };
            var queryResult = simpleNeo4js.query(cypherQuery, queryParameters);

            queryResult.on('data', function (newNodes) {
                assert.equal(newNodes.length, 2, 'Two nodes were returned');

                var namesAndBikeMakes = newNodes.map(function (item) {
                    return item.n.name + " - " + item['COUNT(n)'] + " - " + item['n.age'];
                });

                assert.ok(namesAndBikeMakes.indexOf('Johno Riso - 1 - 18') > -1, "Names returned contains Johno Riso - 1 - 18");
                assert.ok(namesAndBikeMakes.indexOf('Billy Bob - 1 - 34') > -1, "Names returned contains Billy Bob - 1 - 34");

                done();
            });

            queryResult.on('error', function (error) {
                done(error);
            });
        })

        it('should return an array of objects when multiple return types are requested', function(done){

            var cypherQuery = 'MATCH (n:User) RETURN n.age, n, COUNT(n), COLLECT(n)';
            var queryParameters = { };
            var queryResult = simpleNeo4js.query(cypherQuery, queryParameters);

            queryResult.on('data', function (newNodes) {
                assert.equal(newNodes.length, 2, 'Two nodes were returned');
                done();
            });

            queryResult.on('error', function (error) {
                done(error);
            });
        })
    })
})