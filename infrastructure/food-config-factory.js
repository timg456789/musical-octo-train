exports.create = function(tableName, primaryKey) {

    var config = {
        TableName : tableName,
        KeySchema: [
            { AttributeName: primaryKey, KeyType: "HASH"},
            { AttributeName: "time", KeyType: "RANGE" }
        ],
        AttributeDefinitions: [
            { AttributeName: primaryKey, AttributeType: "S" },
            { AttributeName: "time", AttributeType: "N" }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
        }
    };

    return config;
}