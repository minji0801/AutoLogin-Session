var express = require('express');
var router = express.Router();

/* 추가한 부분 */
var app = express();
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const passport = require('passport')
    , LocalStrategy = require('passport-local').Strategy
    , NaverStrategy = require('passport-naver').Strategy
    , KakaoStrategy = require('passport-kakao').Strategy
    , FacebookStrategy = require('passport-facebook').Strategy
    , GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
/* 여기까지 */

const mssql = require('mssql');
const multer = require('multer');
const path = require('path');
/* GET home page. */

const nodemailer = require("nodemailer");

const fs = require('fs');
const emlformat = require('eml-format');


const jsdom = require('jsdom');
const { JSDOM } = jsdom;

// var DomParser = require('dom-parser');


const config = {
    // "user"      : "sa",
    // "password"  : "qw12qw12)",
    // "server"    : "192.168.0.122",
    // "port"      : 1433,
    // "database"  : "aTEST",
    // "timezone"  : 'utc',
    // "options"   : {
    //     "encrypt" : false
    // }
    // "user": "test",
    "user": "sa",
    "password": "qw12qw12",
    //"server": "192.168.137.1",
    "server": "192.168.0.134",
    // "server": "192.168.35.17",
    //"server"    : "192.168.0.135",
    "port": 1433,
    "database": "aTEST",
    // "timezone"  : 'utc',
    "options": {
        encrypt: false, // Use this if you're on Windows Azure 
        enableArithAbort: true
    }
}

var secret_key = 'yuriminfosysqw12qw12';   // JWT 시크릿키

/* configuration */
app.use(cors());
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));
router.use(cookieParser());
/* router.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 31536000000 // 1년
    }

})); */
/* passport와 flash는 반드시 session 다음에 */
router.use(passport.initialize());
router.use(passport.session());
//router.use(flash());

 
// 로그인이 성공하면 serializerUser로 user정보를 세션에 저장
passport.serializeUser(function (user, done) {
    console.log("serializeUser ", user)
    done(null, user);   
});

// Node.js의 모든 페이지에 접근할때, 로그인이 되어있을 경우
// deserializeUser로 session에 저장된 값을 이용 
passport.deserializeUser(function (user, done) {
    console.log("deserializeUser user ", user)
    done(null, user);
    /* var userinfo;
    try {
        mssql.connect(config, function (err) {

            console.log('Connect');
            var request = new mssql.Request();

            var queryString = "SELECT * FROM tALU WHERE ALU_id = '" + id + "'";

            request.query(queryString, function (err, result) {
                if (err) console.log(err);

                console.log("deserializeUser mssql result : ", result);
                var json = JSON.stringify(result.recordset[0]);
                userinfo = JSON.parse(json);
                done(null, userinfo);
            })
        });
    }
    catch (err) {
        console.log(err);
    } */
});

// 사용자 회원가입(이메일가입)
router.post('/signup', function (req, res, next) {
    try {
        console.log('api/signup!!');
        console.log(req.body.name);
        console.log(req.body.email);
        console.log(req.body.pw);

        var sid = req.sessionID;
        var id = Math.random().toString(36).slice(2);
        var email = req.body.email;
        var pw = req.body.pw;
        var name = req.body.name;
        console.log('sessionID : ', sid);

        mssql.connect(config, function (err) {

            console.log('Connect');
            var request = new mssql.Request();

            var checkEmail = "SELECT * FROM tALU WHERE ALU_email = '" + email + "'";
            var insertData = "INSERT INTO tALU VALUES ('" + sid + "', '" + id + "', '"  + email + "', '" + pw + "', '" + name + "', 'email');";

            request.query(checkEmail, function (err, result) {

                if (result.rowsAffected[0] == 0) {

                    // 중복 없음 -> 회원가입 가능
                    request.query(insertData, function (err, result) {

                        console.log('이메일 중복없음!');
                        
                        res.cookie("user_session", sid, {
                            maxAge: 31536000000 // 1년
                        });

                        res.json({ data: 'OK' });

                    })
                } else {

                    // 중복 있음 -> 회원가입 불가능
                    console.log('이메일 중복있음!');

                    res.json({ data: 'NO' });
                }
            })
        });
    }
    catch (err) {
        console.log(err);
    }
});

// passport - username & password
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'pw'
},
    function (username, password, done) {
        console.log('passport-local!!');
        try {
            mssql.connect(config, function (err) {

                console.log('Connect');
                var request = new mssql.Request();

                var queryString = "SELECT * FROM tALU WHERE ALU_email = '" + username + "' AND ALU_pw = '" + password + "'";

                request.query(queryString, function (err, result) {

                    // 입력받은 ID와 비밀번호에 일치하는 회원정보가 없는 경우   
                    if (result.rowsAffected[0] === 0) {

                        console.log("로그인 실패!");
                        return done(null, false);

                    } else {

                        console.log("로그인 성공!");
                        var json = JSON.stringify(result.recordset[0]);
                        var userinfo = JSON.parse(json);
                        return done(null, userinfo);  // result값으로 받아진 회원정보를 return해줌
                    }
                })
            });
        }
        catch (err) {
            console.log(err);
        }
    }
));

// 이메일로그인
router.post('/emaillogin', function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        console.log('passport-local callback!');
        
        if (!user) {
            // 로그인실패
            return res.redirect('/login');
        }

        req.logIn(user, /* { session: false }, */ function (err) {

            if (err) {
                return next(err);
            } else {
                // 로그인성공
                console.log('emaillogin/callback user : ', req.user);
                var sid = req.sessionID;

                // db에 sid 업데이트
                try {
                    mssql.connect(config, function (err) {
        
                        console.log('Connect');
                        var request = new mssql.Request();
        
                        var queryString = "UPDATE tALU SET ALU_sid = '" + sid + "' WHERE ALU_email = '" + req.user.email + "'";
        
                        request.query(queryString, function (err, result) {

                            // user_session 쿠키 생성
                            res.cookie("user_session", sid, {
                                maxAge: 31536000000 // 1년
                            });

                            return res.redirect('/welcome');
                        })
                    });
                }
                catch (err) {
                    console.log(err);
                }
            }
        });
    })(req, res, next);
});

// passport - naver
passport.use(new NaverStrategy({
    clientID: 'jKCn5fyjj_lrGShea38E',
    clientSecret: 'gc3RUBRg5R',
    callbackURL: 'http://192.168.0.134:8087/users/naverlogin/callback'
},
    function (accessToken, refreshToken, profile, done) {
        try {
            console.log('passport-naver!!');
            console.log('naver-login-profile : ', profile);

            var user = { 
                id: profile.id, 
                email: profile.emails[0].value, 
                name: profile.displayName, 
                provider: profile.provider, 
                /* profile_image: profile._json.profile_image,
                age: profile._json.age,
                birthday: profile._json.birthday */
            }; 
    
            mssql.connect(config, function (err) {
    
                console.log('Connect');
                var request = new mssql.Request();
    
                var checkUser = "SELECT * FROM tALU WHERE ALU_id = '" + user.id + "' AND ALU_type = '" + user.provider + "'";
    
                request.query(checkUser, function (err, result) {
    
                    if (result.rowsAffected[0] == 0) {
    
                        // DB에 없는 사용자
                        user.status = '회원가입';
                        return done(null, user);

                    } else {

                        // DB에 있는 사용자
                        user.status = '로그인';
                        return done(null, user);
                    }
                })
            });
        }
        catch (err) {
            console.log(err);
        }
    }
));

// 네이버로그인
router.get('/naverlogin', passport.authenticate('naver', {
    session: false,
    failureRedirect: '/login'
}));

// 네이버로그인 콜백
router.get('/naverlogin/callback', function (req, res, next) {
    passport.authenticate('naver', function (err, user) {
        console.log('passport-naver callback!');

        if (!user) {

            console.log('no user');
            return res.redirect('/login'); 

        } else {

            req.logIn(user, function (err) {
                console.log('naverlogin/callback user : ', user);

                try {
                    var sid = req.sessionID;
                    var status = user.status;
    
                    mssql.connect(config, function (err) {
            
                        console.log('Connect');
                        var request = new mssql.Request();

                        var insertData = "INSERT INTO tALU VALUES ('" + sid + "', '" + user.id + "', '" + user.email + "', '" + user.pw + "', '" + user.name + "', '" + user.provider + "')";
                        var updateSid = "UPDATE tALU SET ALU_sid = '" + sid + "' WHERE ALU_id = '" + user.id + "'";

                        if (status == '회원가입') {

                            // insert
                            request.query(insertData, function (err, result) {

                                // user_session 쿠키 생성
                                res.cookie("user_session", sid, {
                                    maxAge: 31536000000 // 1년
                                });

                                return res.redirect('/welcome');
                            })

                        } else if (status == '로그인') {

                            // update
                            request.query(updateSid, function (err, result) {

                                // user_session 쿠키 생성
                                res.cookie("user_session", sid, {
                                    maxAge: 31536000000 // 1년
                                });

                                return res.redirect('/welcome');
                            })
                        }
                    });
                }
                catch (err) {
                    console.log(err);
                }      
            });
        }
    })(req, res);
});

// passport-kakao
passport.use(new KakaoStrategy({
    clientID: 'f4a7066d8d575a30efc4bedb0796989d',
    callbackURL: 'http://192.168.0.134:8087/users/kakaologin/callback',
},
    function (accessToken, refreshToken, profile, done) {
        try {
            console.log('passport-kakao!!');
            console.log('kakao-login-profile : ', profile);

            var user = {
                id: profile.id,
                email: profile._json.kakao_account.email,
                name: profile.username,
                provider: profile.provider,
                /* profile_image: profile._json.kakao_account.profile.profile_image_url,
                age: profile._json.kakao_account.age_range,
                birthday: profile._json.kakao_account.birthday,
                birthday_type: profile._json.kakao_account.birthday_type,
                gender: profile._json.kakao_account.gender */
            };
    
            mssql.connect(config, function (err) {
    
                console.log('Connect');
                var request = new mssql.Request();
    
                var checkUser = "SELECT * FROM tALU WHERE ALU_id = '" + user.id + "' AND ALU_type = '" + user.provider + "'";
    
                request.query(checkUser, function (err, result) {
    
                    if (result.rowsAffected[0] == 0) {

                        // DB에 없는 사용자
                        user.status = '회원가입';
                        return done(null, user);

                    } else {

                        // DB에 있는 사용자
                        user.status = '로그인';
                        return done(null, user);
                    }
                })
            });
        }
        catch (err) {
            console.log(err);
        }
    }
));

// 카카오로그인
router.get('/kakaologin', passport.authenticate('kakao', {
    session: false,
    failureRedirect: '/login'
}));

// 카카오로그인 콜백
router.get('/kakaologin/callback', function (req, res, next) {
    passport.authenticate('kakao', function (err, user) {
        console.log('passport-kakao callback!');

        if (!user) {

            console.log('no user');
            return res.redirect('/login'); 

        } else {

            req.logIn(user, function (err) {
                console.log('kakaologin/callback user : ', user);
    
                try {
                    var sid = req.sessionID;
                    var status = user.status;
    
                    mssql.connect(config, function (err) {
            
                        console.log('Connect');
                        var request = new mssql.Request();

                        var insertData = "INSERT INTO tALU VALUES ('" + sid + "', '" + user.id + "', '" + user.email + "', '" + user.pw + "', '" + user.name + "', '" + user.provider + "')";
                        var updateSid = "UPDATE tALU SET ALU_sid = '" + sid + "' WHERE ALU_id = '" + user.id + "'";

                        if (status == '회원가입') {

                            // insert
                            request.query(insertData, function (err, result) {

                                // user_session 쿠키 생성
                                res.cookie("user_session", sid, {
                                    maxAge: 31536000000 // 1년
                                });

                                return res.redirect('/welcome');
                            })

                        } else if (status == '로그인') {

                            // update
                            request.query(updateSid, function (err, result) {

                                // user_session 쿠키 생성
                                res.cookie("user_session", sid, {
                                    maxAge: 31536000000 // 1년
                                });

                                return res.redirect('/welcome');
                            })
                        }
                    });
                }
                catch (err) {
                    console.log(err);
                }           
            });
        }
    })(req, res);
});

// passport-facebook
passport.use(new FacebookStrategy({
    clientID: '872351713594449',
    clientSecret: '1d63016dd325a43ce7c9a81ab5d8c3a1',
    callbackURL: "https://192.168.0.134/users/facebooklogin/callback",
    profileFields: ['email', 'id', 'displayName', 'photos']
},
    function (accessToken, refreshToken, profile, done) {

        try {
            console.log('passport-facebook!!');
            console.log('facebook-login-profile : ', profile);

            var user = {
                id: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName,
                provider: profile.provider,
                //profile_image: profile.photos[0].value
            };
    
            mssql.connect(config, function (err) {
    
                console.log('Connect');
                var request = new mssql.Request();
    
                var checkUser = "SELECT * FROM tALU WHERE ALU_id = '" + user.id + "' AND ALU_type = '" + user.provider + "'";
    
                request.query(checkUser, function (err, result) {
    
                    if (result.rowsAffected[0] == 0) {
    
                        // DB에 없는 사용자
                        user.status = '회원가입';
                        return done(null, user);
                        
                    } else {
                        
                        // DB에 있는 사용자
                        user.status = '로그인';
                        return done(null, user);
                    }
                })
            });
        }
        catch (err) {
            console.log(err);
        }
    }
));

// 페이스북로그인
router.get('/facebooklogin', passport.authenticate('facebook', {
    scope: ['email'],
    session: false,
    failureRedirect: '/login'
}));

// 페이스북로그인 콜백
router.get('/facebooklogin/callback', function (req, res, next) {
    passport.authenticate('facebook', function (err, user) {
        console.log('passport-facebook callback!!');

        if (!user) {

            console.log('no user');
            return res.redirect('/login'); 

        } else {

            req.logIn(user, function (err) {
                console.log('facebooklogin/callback user : ', user);
    
                try {
                    var sid = req.sessionID;
                    var status = user.status;
    
                    mssql.connect(config, function (err) {
            
                        console.log('Connect');
                        var request = new mssql.Request();

                        var insertData = "INSERT INTO tALU VALUES ('" + sid + "', '" + user.id + "', '" + user.email + "', '" + user.pw + "', '" + user.name + "', '" + user.provider + "')";
                        var updateSid = "UPDATE tALU SET ALU_sid = '" + sid + "' WHERE ALU_id = '" + user.id + "'";

                        if (status == '회원가입') {

                            // insert
                            request.query(insertData, function (err, result) {

                                // user_session 쿠키 생성
                                res.cookie("user_session", sid, {
                                    maxAge: 31536000000 // 1년
                                });

                                return res.redirect('/welcome');
                            })

                        } else if (status == '로그인') {

                            // update
                            request.query(updateSid, function (err, result) {

                                // user_session 쿠키 생성
                                res.cookie("user_session", sid, {
                                    maxAge: 31536000000 // 1년
                                });

                                return res.redirect('/welcome');
                            })
                        }
                    });
                }
                catch (err) {
                    console.log(err);
                }         
            });
        }
    })(req, res);
});

// passport-google
passport.use(new GoogleStrategy({
    clientID: '706426410759-v8mjqnsi67efdprf0qsg6pm78ckjt7ie.apps.googleusercontent.com',
    clientSecret: 'QxHrFf2R2sxV7JPP3hmEf0B_',
    callbackURL: "http://localhost:8087/users/googlelogin/callback"    
},
    function (accessToken, refreshToken, profile, done) {

        try {
            console.log('passport-google!!');
            console.log('google-login-profile : ', profile);

            var user = {
                id: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName,
                provider: profile.provider,
                /* profile_image: profile.photos[0].value,
                locale: profile._json.locale */
            };
    
            mssql.connect(config, function (err) {
    
                console.log('Connect');
                var request = new mssql.Request();
    
                var checkUser = "SELECT * FROM tALU WHERE ALU_id = '" + user.id + "' AND ALU_type = '" + user.provider + "'";
    
                request.query(checkUser, function (err, result) {
    
                    if (result.rowsAffected[0] == 0) {
    
                        // DB에 없는 사용자
                        user.status = '회원가입';
                        return done(null, user);

                    } else {
                        
                        // DB에 있는 사용자
                        user.status = '로그인';
                        return done(null, user);
                    }
                })
            });
        }
        catch (err) {
            console.log(err);
        }
    }
));

// 구글로그인
router.get('/googlelogin', passport.authenticate('google', {
    scope: ['https://www.googleapis.com/auth/plus.login', 'email'],
    session: false,
    failureRedirect: '/login'
}));

// 구글로그인 콜백
router.get('/googlelogin/callback', function (req, res, next) {
    passport.authenticate('google', function (err, user) {
        console.log('passport-google callback!');

        if (!user) {

            console.log('no user');
            return res.redirect('/login'); 

        } else {

            req.logIn(user, function (err) {
                console.log('googlelogin/callback user : ', user);
    
                try {
                    var sid = req.sessionID;
                    var status = user.status;
    
                    mssql.connect(config, function (err) {
            
                        console.log('Connect');
                        var request = new mssql.Request();

                        var insertData = "INSERT INTO tALU VALUES ('" + sid + "', '" + user.id + "', '" + user.email + "', '" + user.pw + "', '" + user.name + "', '" + user.provider + "')";
                        var updateSid = "UPDATE tALU SET ALU_sid = '" + sid + "' WHERE ALU_id = '" + user.id + "'";

                        if (status == '회원가입') {

                            // insert
                            request.query(insertData, function (err, result) {

                                // user_session 쿠키 생성
                                res.cookie("user_session", sid, {
                                    maxAge: 31536000000 // 1년
                                });

                                return res.redirect('/welcome');
                            })

                        } else if (status == '로그인') {

                            // update
                            request.query(updateSid, function (err, result) {

                                // user_session 쿠키 생성
                                res.cookie("user_session", sid, {
                                    maxAge: 31536000000 // 1년
                                });

                                return res.redirect('/welcome');
                            })
                        }
                    });
                }
                catch (err) {
                    console.log(err);
                }             
            });
        }
    })(req, res);
});

// 로그아웃
router.post('/logout', function (req, res, next) {

    // 쿠키 삭제
    res.clearCookie('user_session');
    res.redirect('/login');
});

// JWT값 가져오기
router.get('/getJWT', function (req, res, next) {
    
    console.log(req.cookies.user);

    if (req.cookies.user == undefined) {

        // 쿠키에 user 없음
        res.json({ data: 'NO' });

    } else {

        // 쿠키에 user 있음
        var decoded = jwt.verify(req.cookies.user, secret_key);

        console.log(decoded);

        var logintype = decoded.type;

        if (logintype == 'email') {
            // 이메일 로그인인경우
            // id, pw 가져와서 db에 있는 사용자인지 확인
            var id = decoded.id;
            var pw = decoded.pw;

            try {
                mssql.connect(config, function (err) {

                    console.log('Connect');
                    var request = new mssql.Request();

                    var checkUser = "SELECT * FROM tALU WHERE ALU_id = '" + id + "' AND ALU_pw = '" + pw + "'";
                    request.query(checkUser, function (err, result) {

                        if (result.rowsAffected[0] == 0) {
                            // db에 없는 user -> 로그인 불가능
                            res.json({ data: 'INCORRECT' });

                        } else {
                            // user 존재 -> 로그인 가능
                            console.log('user 쿠키 있음!');
                            res.json({ data: 'OK', name: decoded.name});
                        }
                    })
                });
            }
            catch (err) {
                console.log(err);
            }
        } else {
            // 네이버, 카카오, 구글 로그인인경우
            // id 가져와서 db에 있는 사용자인지 확인

            var id = decoded.id;
            var result = getJWTsocial(id);

            if (result == 'INCORRECT') {
                res.json({ data: 'INCORRECT' });
            } else {
                res.json({ data: 'OK', name: decoded.name });
            }

        }
    }
});

router.get('/getSession', function (req, res, next) {

    console.log(req.session);
    console.log(req.headers.cookie);
    console.log('sessionID : ', req.sessionID);

    var cookie = req.headers.cookie;
    var splitHeader = cookie.split('connect.sid=s%3A');
    var splitDot = splitHeader[1].split('.');
    console.log('cookieSID : ', splitDot[0]);

    // user-session 쿠키 값(세션id) 가져와서 db에 있나 확인
    console.log('user_session : ', req.cookies.user_session);
    var sid = req.cookies.user_session;

    if (sid == undefined) {

        // 쿠키에 user_session 없음
        console.log('user_session 쿠키 없음!!');
        res.json({ data: 'NO' });

    } else {

        // 쿠키에 user_session 있음
        try {
            mssql.connect(config, function (err) {
    
                console.log('Connect');
                var request = new mssql.Request();
    
                var checkSID = "SELECT * FROM tALU WHERE ALU_sid = '" + sid + "'";
                request.query(checkSID, function (err, result) {
    
                    if (result.rowsAffected[0] == 0) {
                        // db에 없는 sid -> 로그인 불가능
                        console.log('sid 없음!!');
                        res.json({ data: 'INCORRECT' });
    
                    } else {
                        // db에 있는 sid -> 로그인 가능
                        console.log('sid 있음!!');
                        res.json({ data: 'OK'});
                    }
                })
            });
        }
        catch (err) {
            console.log(err);
        }
    }
});

router.get('/getName', function (req, res, next) {

    console.log('user_session : ', req.cookies.user_session);
    var sid = req.cookies.user_session;

    if (sid == undefined) {

        // 쿠키에 user_session 없음
        console.log('user_session 쿠키 없음!!');
        res.json({ data: 'NO' });

    } else {

        // 쿠키에 user_session 있음
        try {
            mssql.connect(config, function (err) {

                console.log('Connect');
                var request = new mssql.Request();

                var getName = "SELECT ALU_name FROM tALU WHERE ALU_sid = '" + sid + "'";
                request.query(getName, function (err, result) {

                    if (result.rowsAffected[0] == 0) {
                        res.json({ data: 'INCORRECT' });

                    } else {
                        res.json({ data: 'OK', name: result.recordset[0].ALU_name});
                    }
                })
            });
        }
        catch (err) {
            console.log(err);
        }
    }
});

/* GET users listing. */
router.get('/', function (req, res, next) {
    res.send('respond with a resource');
});

module.exports = router;

// 소셜로그인 JWT 가져와서 USER 확인
function getJWTsocial(id) {

    console.log('getJWTsocial!!');

    try {
        mssql.connect(config, function (err) {

            console.log('Connect');
            var request = new mssql.Request();

            var checkUser = "SELECT * FROM tALU WHERE ALU_id = '" + id + "'";
            request.query(checkUser, function (err, result) {

                if (result.rowsAffected[0] == 0) {
                    // db에 없는 user -> 로그인 불가능
                    return 'INCORRECT';

                } else {
                    // user 존재 -> 로그인 가능
                    console.log('user 쿠키 있음!');
                    return 'OK';
                }
            })
        });
    }
    catch (err) {
        console.log(err);
    }
}