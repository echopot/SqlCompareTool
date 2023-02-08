const backupTabels = getTable('backup.sql');
const currentTabels = getTable('current.sql');
const changes = compareTables(backupTabels, currentTabels);

printChanegs(changes.edited, changes.news, changes.deleted);

function getTable(file) {
    const fs = require('fs');
    const allFileContents = fs.readFileSync(file, 'utf-8');
    let table = {};

    allFileContents.split(/\r?\n/).forEach(line =>  {
        if(line.includes('INSERT INTO')) {
            let ignoreTables = ['db', 'engine_cost', 'global_grants', 'help_category', 'help_keyword', 'help_relation', 'help_topic', 'proxies_priv', 'replication_group_configuration_version', 'replication_group_member_actions', 'server_cost', 'tables_priv', 'user'];
            let tableName = line.split('INSERT INTO `').pop().split('`')[0];
            if(!ignoreTables.includes(tableName)) {
                let tableHeaders = headerToArray(line.split('` ').pop().split(' VALUES')[0]);
                let tableContent = valuesToArray(line.split('VALUES ').pop().split(';')[0]);
                table[tableName] = combineTable(tableHeaders, tableContent);
            }
        }
    });
    return table;
}

function valuesToArray(string) {
    let splitted = string.split(/\((.*?)\),?/);
    let array = [];
    for(let row of splitted) {
        if(row != '') {
            let splittedRow = row.split(',')
            let values = [];
            for(let value of splittedRow) {
                let v = value.replaceAll('\'', '');
                if(v == parseInt(v)) v = parseInt(v);
                if(v == parseFloat(v)) v = parseFloat(v);
                if(v == 'ture') v = true;
                if(v == 'false') v = false;
                values.push(v)
            }
            array.push(values);
        }
    }
    return array;
}

function headerToArray(string) {
    let splitted = string.split(/\((.*?)\),?/);
    for(let row of splitted) {
        if(row != '') {
            let splittedRow = row.split(', ')
            let values = [];
            for(let value of splittedRow) {
                let v = value.replaceAll('`', '');
                values.push(v);
            }
            return values;
        }
    }
    return [];
}

function combineTable(headers, content) {
    let table = [];
    for(let row of content) {
        let obj = {};
        headers.forEach((element, index) => {
            obj[element] = row[index];
        });
        table.push(obj)
    }
    return table;
}

function compareTables(backup, current) {
    if(backup == current) {
        console.log('no diff');
        return null;
    }

    let edited = {};
    let news = [];
    let deleted = [];

    for (const [key, value] of Object.entries(backup)) {
        if(value != current[key]) {
            edited[key] = [];
            news[key] = [];
            deleted[key] = [];
            for(let i = 0; i < value.length; i++){
                let result = current[key].find(e => e.id == value[i]['id']);
                if(result === undefined) {
                    deleted[key].push(value[i]);
                } else if(JSON.stringify(value[i]) !== JSON.stringify(result)) {
                    edited[key].push(result);
                }
            }
            for(let i = 0; i < current[key].length; i++){
                let result = value.find(e => e.id == current[key][i]['id']);
                if(result === undefined) {
                    news[key].push(current[key][i]);
                }
            }
        }
    }
    return {edited: edited, news: news, deleted: deleted}
}

function printChanegs(edited, news, deleted) {
    let content = getEditedQuerys(edited);
    content += getNewQuerys(news);
    content += getDeleteQuerys(deleted);
    
    const fs = require('fs');
    fs.writeFile('results.txt', content, err => {
        if (err) {
            console.error(err);
        }
        console.error('file written successfully');
    });
}

function getEditedQuerys(edited) {
    let content = '';

    for(let item in edited) {
        edited[item].forEach(row => {
            const id = row.id;
            delete row.id;
            content += 'UPDATE ' + item + ' SET ' +
            Object.entries(row).map(
                ([key, value]) => {
                    if(typeof(value) == 'string') {
                        return `${key} = '${value}'`;
                    } 
                    return `${key} = ${value}`;  
                }
            )
            + ' WHERE id = ' + id + ';\n';
        })
    }

    return content;
}

function getNewQuerys(news) {
    let content = '';

    for(let item in news) {
        news[item].forEach(row => {
            content += 'INSERT INTO ' + item + '(' +
            Object.entries(row).map(
                ([key, value]) => {
                        return key;
                }
            )
            + ')' + ' VALUES ' + '(' +
            Object.entries(row).map(
                ([key, value]) => {
                    if(typeof(value) == 'string') {
                        return `'${value}'`;
                    } 
                    return value;
                }
            )
            + ');\n';
        })
    }

    return content;
}

function getDeleteQuerys(deleted) {
    let content = '';

    for(let item in deleted) {
        deleted[item].forEach(row => {
            content += 'DELETE FROM ' + item + ' WHERE id = ' + row.id + ';\n';
        })
    }

    return content;
}