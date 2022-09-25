const mysql = require('mysql')
const pool = mysql.createPool({
  host     :  'localhost',
  user     :  'root',
  password :  '123456',
  database :  'minimall'
})
 
//将数据库的异步操作，封装在一个Promise中
let query = function( sql, values ) {
  return new Promise(( resolve, reject ) => {
    pool.getConnection((err, conn)=>{
      if (err) {
        reject( err )
      } else {
        conn.query(sql, values, ( err, rows) => {
          if ( err ) {
            reject( err )
          } else {
            resolve( rows )
          }
          conn.release()
        })
      }
    })
  })
}
 
module.exports = { query }