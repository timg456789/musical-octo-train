var test = require('tape');
var factory = require('./dynamodb-factory');
var db = factory.create();
var AWS = require('aws-sdk');
var config = {
    region: 'us-east-1'
};
var docDb = new AWS.DynamoDB.DocumentClient(config);
var tableCreationWait = require('./table-creation-wait');

exports.run = function(tableName) {

    function tableExists(searchName, tableNames) {
        var exists = false;

        for (var i = 0; i < tableNames.length; i++) {
            if (searchName === tableNames[i]) {
                exists = true;
                break;
            }
        }

        return exists;
    }

    test('delete table if in use', function(t) {
        t.plan(4);

        db.listTables(function (err, data) {
            t.false(err, 'error doesnt occur when listing tables');

            var exists = tableExists(tableName, data.TableNames);
            if (!exists) {
                console.log('table not found for delete');
                t.pass();
                t.pass();
                t.pass();
            } else {
                console.log('table found for delete');

                var deleteTestTable = { TableName: tableName };
                db.deleteTable(deleteTestTable, function(err, data) {
                    t.ok(!err, err);
                    t.equal(data.TableDescription.TableStatus, 'DELETING', 'integration-test table is deleting');
                    tableCreationWait.runWhenTableIsNotFound(tableName, db, function () {
                        console.log('table is not found, continuing');
                        t.pass();
                    });
                });
            }
        });
    });

    test('create table with food-config-factory', function(t) {
        t.plan(2);

        var foodConfigFactory = require('./food-config-factory');
        var foodConfig = foodConfigFactory.create(tableName, 'user');

        db.createTable(foodConfig, function(err, data) {
            t.false(err, 'error doesnt occur when creating table');
            t.equal(data.TableDescription.TableStatus, 'CREATING', 'table status is creating');
        });
    });

    test('table status changes from creating to active', function(t) {
        t.plan(2);

        var describeParams = {};
        describeParams.TableName = tableName;

        var desiredStatus = 'ACTIVE';

        tableCreationWait.runWhenTableIs(tableName, desiredStatus, db, function() {
            db.describeTable(describeParams, function (err, data) {
                t.false(err, 'error doesnt occur when describing table after waiting for creation');
                t.equal(data.Table.TableStatus, desiredStatus, 'table status is ' + desiredStatus + ' after creating');
            });
        });
    });

    test('insert test data', function (t) {
        t.plan(2);

        var data = {
            TableName: tableName,
            Item: {
                user: 'testing-123',
                time: new Date().getTime(),
                name: 'first dollar',
                amount: 101
            }
        };

        docDb.put(data, function(err, data) {
            t.ok(!err, err);
            console.log(data);
            t.ok(data);
        });


    });

    test('get test data', function(t) {
        t.plan(2);

        var conditions = {
            TableName: tableName,
            KeyConditionExpression: '#storedUser = :desiredUser',
            ExpressionAttributeNames: {
                '#storedUser': 'user'
            },
            ExpressionAttributeValues: {
                ':desiredUser': 'testing-123'
            }
        }

        docDb.query(conditions, function(err, data) {
            console.log(data);
            t.ok(!err, err);
            t.ok(data.Count > 0, 'table has data');
        })

    });
}