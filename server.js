require('dotenv').config();
const express = require('express');
const app = express();
const mysql = require('mysql');
const cors = require('cors');
const bcript = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(cors());
app.use(express.json());



const PORT = 3000;
// //use schema 

const db = mysql.createConnection({
    user: 'root',
    host: 'localhost',
    password: '',
    database: 'todolist',
});

// implement all the features from JSON_as_DB project 
// implement status code 

db.connect((error, res) => {
    if (error) {
        console.log(error);
    } else {
        console.log('connected to database');
    }
});         

app.get('/', (req, res) => {
    res.send('Hello World');
}); 

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    let token = authHeader && authHeader.split(' ')[1]    
    
    if (token === null ) {
        return res.sendStatus(401)
    }    
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus("this is a error \n",403)            
        req.user = user
        next()
    })
}


function generateAccessToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
}

app.get('/users', authenticateToken, (req, res) => {

    // implement try catch 

    if (req.user.role === "admin") {
        const sqlSelect = "SELECT * FROM tbl_users";
        db.query(sqlSelect, (err, result) => {
            res.send(result);
        });
    }
    else {
        res.send("Only admin can see the user list");
    }
});

app.delete('/users', authenticateToken, (req, res) => {
    if (req.user.role === "admin") {
        const name = req.body.name;

        const selectsql = "SELECT * FROM tbl_users WHERE name = '" + name + "';";
        console.log(selectsql);
        db.query(selectsql, (err, result) => {
            if (result.length > 0) {
                const id = result[0].id;

                let sqlDelete = "DELETE FROM tbl_task WHERE id = " + id + ";";
                
                db.query(sqlDelete, (err, result) => {
                    sqlDelete = "DELETE FROM tbl_users WHERE id = " + id + ";";
                    db.query(sqlDelete, (err, result) => {
                        res.send(result);
                    });
                });
            }
            else {
                res.send("No user found");
            }
        });
    }
    else {
        res.send("Only admin can delete a user");
    }
});

app.get('/user/profile', authenticateToken, (req, res) => {
    const name = req.user.name;
    const selectsql = "SELECT * FROM tbl_users WHERE name = '" + name + "';";
    db.query(selectsql, (err, result) => {
        res.send(result);
    })
})

app.post('/user/profile', async (req, res) => {
    try {
        const name = req.body.name;
        const email = req.body.email;
        const password = req.body.password;

        if ((name == null) || (email == null) || (password == null)) {
            res.send('name, email and password is required !');
            return;
        }

        // check if user already exists
        // checking username 
        let sqlSelect = "SELECT * FROM tbl_users WHERE name = '" + name + "';";
        db.query(sqlSelect, (err, result) => {
            if (result.length > 0) {
                res.send("Username already exists");
                return;
            }
        });

        // checking email
        sqlSelect = "SELECT * FROM tbl_users WHERE email = '" + email + "';";
        db.query(sqlSelect, (err, result) => {
            if (result.length > 0) {
                res.send("Email already exists");
                return;
            }
        });


        const salt = 10;
        const hashedpass = await bcript.hash(req.body.password, salt);
        const sqlInsert = "INSERT INTO tbl_users (name,email,password,role) VALUES ('" + req.body.name + "','" + req.body.email + "','" + hashedpass + "','" + "regular_user'); ";
        db.query(sqlInsert, (err, result) => {
            res.status(201).send(result);
        });
    } catch (error) {
        res.status(500).send(error);
    }
});


app.patch('/user/profile', authenticateToken, async (req, res) => {
    const new_name = req.body.name;
    const new_email = req.body.email;
    const newpassword = req.body.password;
    const currentpassword = req.body.currentpassword;

    const name = req.user.name;
    const email = req.user.email;

    const selectsql = "SELECT * FROM tbl_users WHERE name = '" + name + "';";
    db.query(selectsql, async (err, result) => {

        validpass = await bcript.compare(currentpassword, result[0].password);
        if (validpass) {
            const id = result[0].id;

            let updateSql;

            if (new_name != null && new_name != name) {
                updateSql = "UPDATE tbl_users SET name = '" + new_name + "' WHERE id = " + `${id}` + " ;"
                db.query(updateSql, (err, result) => { })
            }

            if (new_email != null && new_email != email) {
                updateSql = "UPDATE tbl_users SET email = '" + new_email + "' WHERE id = " + `${id}` + " ;"
                db.query(updateSql, (err, result) => { })
            }

            if (newpassword != null) {
                const salt = 10;
                const hashedpass = await bcript.hash(newpassword, salt);
                updateSql = "UPDATE tbl_users SET password = '" + hashedpass + "' WHERE id = " + `${id}` + " ;"
                db.query(updateSql, (err, result) => { })
            }

            const selectsql = "SELECT * FROM tbl_users WHERE id = " + `${id}` + " ;"
            db.query(selectsql, (err, result) => {
                res.send(result);
            })
        }
        else {
            res.send("sorry wrong password");
        }

    })
});

app.delete('/user/profile', authenticateToken, (req, res) => {
    const name = req.user.name;
    const currentpassword = req.body.currentpassword;
    console.log(currentpassword);
    let selectsql = "SELECT * FROM tbl_users WHERE name = '" + name + "';";
    db.query(selectsql, async (err, result) => {
        
        const validpass = await bcript.compare(currentpassword, result[0].password);
        if (validpass) {
            const id = result[0].id;            
            let sqlDelete = "DELETE FROM tbl_task WHERE id = " + id + ";";
            console.log(sqlDelete);
            db.query(sqlDelete, (err, result) => {
                sqlDelete = "DELETE FROM tbl_users WHERE id = " + id + ";";
                db.query(sqlDelete, (err, result) => {
                    res.send(result);
                });
            });                
        }
        else {
            res.send("password invalid");
        }
    });
})

app.get('/tasks',authenticateToken, (req, res) => {
    if (req.user.role === "admin") {
        const sqlSelect = "SELECT * FROM `tbl_task` ;";
        const r = null;
        db.query(sqlSelect, (err, result) => {            
            res.send(result);
        });
    }
    else {
        res.send("only an admin can see all the tasks");
    }    
});

app.get('/users/tasks', authenticateToken, (req, res) => {
    const name = req.user.name;
    let sqlSelect = "SELECT * FROM `tbl_users` WHERE name = '" + `${name}` + "';";
    db.query(sqlSelect, (err, result) => {
        sqlSelect = "SELECT * FROM `tbl_task` WHERE id = " + `${result[0].id}` + ";";
        db.query(sqlSelect, (err, u_tasks) => {
            res.send(u_tasks);
        })
    });
});

app.get('/users/tasks/sorted_id', authenticateToken, (req, res) => {
    const name = req.user.name;
    let sqlSelect = "SELECT * FROM `tbl_users` WHERE name = '" + `${name}` + "';";
    db.query(sqlSelect, (err, result) => {
        sqlSelect = "SELECT * FROM `tbl_task` WHERE id = " + `${result[0].id}` + ";";        
        db.query(sqlSelect, (err, u_tasks) => {
            u_tasks.sort((a, b) => a.id - b.id);
            res.send(u_tasks);
        })
    });  
});

app.get('/users/tasks/sorted_staus', authenticateToken, (req, res) => {
    const name = req.user.name;
    let sqlSelect = "SELECT * FROM `tbl_users` WHERE name = '" + `${name}` + "';";
    db.query(sqlSelect, (err, result) => {
        sqlSelect = "SELECT * FROM `tbl_task` WHERE id = " + `${result[0].id}` + " ORDER BY `tbl_task`.`_status` ASC;";        
        db.query(sqlSelect, (err, u_tasks) => {
            res.send(u_tasks);
        })
    });  
});


app.get('/users/tasks/:id', authenticateToken, (req, res) => {
    const name = req.user.name;
    const id = req.params.id;
    let sqlSelect = "SELECT * FROM `tbl_users` WHERE name = '" + `${name}` + "';";
    db.query(sqlSelect, (err, result) => {
        sqlSelect = "SELECT * FROM `tbl_task` WHERE id = " + `${result[0].id}` + "&& id = "+`${id}`+" ;";
        db.query(sqlSelect, (err, ut_tasks) => {
            res.send(ut_tasks);
        })
    });
});


app.post('/users/tasks', authenticateToken, (req, res) => {
    const name = req.user.name;
    let sqlSelect = "SELECT * FROM `tbl_users` WHERE name = '" + `${name}` + "';";
    db.query(sqlSelect, (err, result) => {
        const id = result[0].id;
        sqlSelect = "SELECT * FROM `tbl_task` WHERE id = " + `${result[0].id}` + ";";
        db.query(sqlSelect, (err, result) => {

            const id = result.length + 1;
            const title = req.body.title;
            const description = req.body.description;
            const _status = req.body._status;

            const sqlInsert = "INSERT INTO tbl_task VALUES (" + `${id}` + "," + `${id}` + ",'" + title + "','" + description + "','" + _status + "');";
            db.query(sqlInsert, (err, result) => {
                res.send(result);
            });
        });
    });
});

app.patch('/users/tasks/:id', authenticateToken, (req, res) => {
    const new_title = req.body.title;
    const new_description = req.body.description;
    const new_status = req.body._status;
    const id = req.params.id;

    if(new_title === null && new_description === null && new_status === null){
        res.send("invalid update");
        return;
    }
    
    const name = req.user.name;
    let sqlSelect = "SELECT * FROM `tbl_users` WHERE name = '" + `${name}` + "';";
    db.query(sqlSelect, (err, result) => {
        const id = result[0].id;
        let updateSql;

        // UPDATE tbl_task 
        // SET title = 'hi this is new shaeakh'
        // WHERE id = 9 && id = 1 ;


        if(new_title!=null){
            updateSql = "UPDATE tbl_task SET title = '"+new_title+"' WHERE id = "+`${id}`+" &&  id = "+`${id}`+" ;"
            db.query(updateSql, (err, result) => { })
        }
        if(new_description!=null){
            updateSql = "UPDATE tbl_task SET description = '"+new_description+"' WHERE id = "+`${id}`+" &&  id = "+`${id}`+" ;"
            db.query(updateSql, (err, result) => { })
        }
        if(new_status!=null){
            updateSql = "UPDATE tbl_task SET _status = '"+new_status+"' WHERE id = "+`${id}`+" &&  id = "+`${id}`+" ;"
            db.query(updateSql, (err, result) => { })
        }
        // sqlSelect = "SELECT * FROM `tbl_task` WHERE id = " + `${id}` + ";";
        // db.query(sqlSelect, (err, result) => {})

        const selectsql = "SELECT * FROM tbl_task WHERE id = "+`${id}`+" &&  id = "+`${id}`+" ;"
            db.query(selectsql, (err, result) => {
                res.send(result);
            })
    })



});

app.delete('/users/tasks/:id', authenticateToken, (req, res) => {
    const id = req.params.id;
    const name = req.user.name;
    let selectsql = "SELECT * FROM tbl_users WHERE name = '" + name + "';";
    db.query(selectsql, async (err, result) => {
        const id = result[0].id;                    
        let sqlDelete = "DELETE FROM tbl_task WHERE id = " + `${id}` + " &&  id = "+ `${id}` +";";
        db.query(sqlDelete,(err,result)=>{
            res.send(result);
        });
    });
});

app.post('/users/login', async (req, res) => {
    const name = req.body.name;    
    const password = req.body.password;
    const sqlSelect = "SELECT * FROM tbl_users WHERE name = '" + name + "';";    
    db.query(sqlSelect, async (err, result) => {
        try {
            if (err) {
                res.status(500).send("hehehe",err);
                return;
            }
            if (result.length > 0) {
                const validpass = await bcript.compare(password, result[0].password);
                if (validpass) {
                    const user = {
                        name: result[0].name,
                        role: result[0].role
                    };
                    const Token = generateAccessToken(user) 
                    res.status(201).send({status : "Succesfully Logged in ",Token : Token});
                } else {
                    res.status(400).send('Invalid Password');
                }
            } else {
                res.status(400).send('Invalid Username');
                return;
            }
        } catch (error) {
            res.status(500).send('Request Error');
        }
    }
    );
});

app.delete('/users/login', (req, res) => {
    res.send("Logged out");
})

app.patch('/role_cng', authenticateToken, (req, res) => {

    if (req.user.role === "admin") {
        if ((req.body.name != null) && (req.body.role != null)) {
            const sqlSetrole = "UPDATE tbl_users SET role = '" + req.body.role + "' WHERE name = '" + req.body.name + "'; ";
            
            db.query(sqlSetrole, (err, update) => {
                res.send(update);
            })
        }
        else {
            res.send('user_name and status is required !');
        }

    }
    else {
        res.send("Only admins have access");
    }

});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});