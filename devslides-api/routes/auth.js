const handleErrors = require('./handle-errors')
const { UnauthorizedError } = require('../common/errors')
const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')

dotenv.config()

const { env: { JWT_SECRET } } = process

module.exports = (req, res, next) => {
    handleErrors(() => {
        return Promise.resolve()
            .then(() => {
                const { headers: { authorization } } = req

                if (!authorization) throw new UnauthorizedError()

                const token = authorization.slice(7)

                const { sub } = jwt.verify(token, JWT_SECRET)

                req.userId = sub

                next()
            })
    }, res)
}