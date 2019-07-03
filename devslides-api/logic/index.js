const data = require('devslides-data')
const validate = require('../common/validate')
const bcrypt = require('bcrypt')

const { models } = data
const { User, Presentation, Slide, Element } = models

const logic = {

    registerUser(name, surname, username, email, password) {
        validate.arguments([
            { name: 'name', value: name, type: 'string', notEmpty: true },
            { name: 'surname', value: surname, type: 'string', notEmpty: true },
            { name: 'username', value: username, type: 'string', notEmpty: true },
            { name: 'email', value: email, type: 'string', notEmpty: true },
            { name: 'password', value: password, type: 'string', notEmpty: true }
        ])

        validate.email(email)

        return (async () => {
            const hash = await bcrypt.hash(password, 5)

            if (!!await User.findOne({ email })) throw Error(`User with email ${email} already exists`)
            if (!!await User.findOne({ username })) throw Error(`User with username ${username} already exists`)
            // TODO end logic, other cases, flows, states... (user already exists check, etc)

            await User.create({ name, surname, username, email, password: hash })
        })()
    },

    authenticateUser(username, password) {
        validate.arguments([
            { name: 'email', value: username, type: 'string', notEmpty: true },
            { name: 'password', value: password, type: 'string', notEmpty: true }
        ])
        return (async () => {
            let user = await User.findOne({ username }) || await User.findOne({ email: username })
            if (!user) throw Error('Incorrect data')

            if (await bcrypt.compare(password, user.password)) return user.id
            else throw Error('Incorrect data')
        })()
    },

    retrieveUser(id) {
        return (async () => {
            const user = await User.findById(id).select('name surname username email -_id').lean()

            if (!user) throw Error(`User with ID ${id.toString()} does not exist`)
            return user
        })()
    },

    updateUser(id, data) {
        validate.arguments([
            { name: 'id', value: id, type: 'string', notEmpty: true },
            { name: 'data', value: data, type: 'object', notEmpty: true },
        ])
        return (async () => {
            if (await User.findOne({ email: data.email })) throw Error(`User with email ${data.email} already exists`)
            if (await User.findOne({ username: data.username })) throw Error(`User with email ${data.username} already exists`)

            await User.findByIdAndUpdate(id, {
                name: data.name,
                surname: data.surname,
                username: data.username,
                email: data.email,
                password: await bcrypt.hash(data.password, 5)
            })
            return await User.findById(id).select('name surname username email password -_id').lean()
        })()
    },

    deleteUser(id, password) {
        validate.arguments([
            { name: 'id', value: id, type: 'string', notEmpty: true },
            { name: 'password', value: password, type: 'string', notEmpty: true }
        ])
        return (async () => {
            const user = await User.findById(id)
            if (!user) throw Error('User to delete doesnt exist')

            if (await bcrypt.compare(password, user.password))
                await User.findByIdAndRemove(id).lean()
        })()
    },

    createPresentation(id, title) {
        validate.arguments([
            { name: 'id', value: id, type: 'string', notEmpty: true },
            { name: 'title', value: title, type: 'string', notEmpty: true },
        ])
        return (async () => {
            const user = await User.findById(id)
            if (!user) throw Error('User doesnt exist')
            user.presentation && user.presentation.forEach(presentation => {
                if (presentation.author === title) throw Error(`Presentation with title ${title} already exist`)
            })
            const presentation = await Presentation.create({ title, author: id })
            user.presentations.push(presentation.id)
            await user.save()
            await this.createSlide(id,presentation.id,`.Slide-0{\nbackground-color: white \n}`)
        })()
    },

    deletePresentation(user_id, presentationId) {
        validate.arguments([
            { name: 'user_id', value: user_id, type: 'string', notEmpty: true },
            { name: 'presentationId', value: presentationId, type: 'string', notEmpty: true }
        ])
        return (async () => {
            const user = await User.findById(user_id)
            if (!user) throw Error('User to delete doesnt exist')
            if (!user.presentations) throw Error('No presentations to delete')
            const presentations = user.presentations.filter(presentation => {
                return !((presentation._id.toString()) === presentationId)
            })
            await Presentation.findByIdAndRemove(presentationId)
            user.presentations = presentations
            await user.save()
        })()
    },

    updatePresentationTitle(user_id, presentationId, title) {
        validate.arguments([
            { name: 'user_id', value: user_id, type: 'string', notEmpty: true },
            { name: 'presentationId', value: presentationId, type: 'string', notEmpty: true },
            { name: 'title', value: title, type: 'string', notEmpty: true }
        ])
        return (async () => {
            const user = await User.findById(user_id).lean()
            if (!user) throw Error('User to delete doesnt exist')
            if (!user.presentations.find(presentation => presentation._id.toString() === presentationId))
                throw Error('Presentation doesnt exist')
            await Presentation.findByIdAndUpdate(presentationId, { title })
        })()
    },

    updateSlideStyle(user_id, presentationId, slideId, style) {
        validate.arguments([
            { name: 'user_id', value: user_id, type: 'string', notEmpty: true },
            { name: 'presentationId', value: presentationId, type: 'string', notEmpty: true },
            { name: 'slideId', value: slideId, type: 'string', notEmpty: true },
            { name: 'style', value: style, type: 'string', notEmpty: true }
        ])
        return (async () => {
            const user = await User.findById(user_id).lean()
            if (!user) throw Error('User to delete doesnt exist')
            if (!user.presentations.find(presentation => presentation._id.toString() === presentationId))
                throw Error('Presentation doesnt exist')

            const presentation = await Presentation.findById(presentationId)
            presentation.slides.forEach(slide => {
                if (slide._id.toString() === slideId) slide.style = style
            })
            await presentation.save()
        })()
    },

    updateSlide(user_id, presentationId, updateSlides, updateElements) {
        validate.arguments([
            { name: 'user_id', value: user_id, type: 'string', notEmpty: true },
            { name: 'presentationId', value: presentationId, type: 'string', notEmpty: true },
            { name: 'updateSlides', value: updateSlides, type: 'object', notEmpty: true },
            { name: 'updateElements', value: updateElements, type: 'object', notEmpty: true }
        ])
        return (async () => {
            const user = await User.findById(user_id)
            if (!user) throw Error('User to delete doesnt exist')
            if (!user.presentations.find(presentation => presentation._id.toString() === presentationId))
                throw Error('Presentation doesnt exist')
            const presentation = await Presentation.findById(presentationId)

            updateSlides.forEach(slideId => {
                for (let i = 0; i < presentation.slides.length; i++) {
                    if (presentation.slides[i]._id.toString() == slideId.toString()) {
                        const slide = presentation.slides[i]
                        updateElements.forEach(element => {
                            for (let j = 0; j < slide.elements.length; j++) {
                                if (slide.elements[j]._id.toString() === element._id.toString()) {
                                    slide.elements[j].type = element.type
                                    slide.elements[j].content = element.content
                                    slide.elements[j].style = element.style

                                    presentation.slides[i] = slide;
                                    break
                                }
                            }
                        })
                    }
                }
            })
            await presentation.save()
            debugger
        })()
    },

    retrievePresentations(id) {
        return (async () => {
            debugger
            const presentations = []
            const user = await User.findById(id).lean()
            if (!user) throw Error(`User with ID ${id.toString()} does not exist`)
            await Promise.all(
                user.presentations.map(async presentationid => {
                    const presentation = await Presentation.findById(presentationid).select('title').lean()
                    presentations.push(presentation)
                })
            )
            return presentations
        })()
    },

    retrievePresentation(user_id, presentationId) {
        validate.arguments([
            { name: 'user_id', value: user_id, type: 'string', notEmpty: true },
            { name: 'presentationId', value: presentationId, type: 'string', notEmpty: true }
        ])
        return (async () => {
            const user = await User.findById(user_id)
            if (!user) throw Error('User doesnt exist')
            if (!user.presentations.find(presentation => presentation._id.toString() === presentationId))
                throw Error('Presentation doesnt exist')
            return await Presentation.findById(presentationId).lean()
        })()
    },

    createSlide(user_id, presentation_id, style) {
        validate.arguments([
            { name: 'user_id', value: user_id, type: 'string', notEmpty: true },
            { name: 'presentation_id', value: presentation_id, type: 'string', notEmpty: true },
            { name: 'style', value: style, type: 'string', notEmpty: true },
        ])
        return (async () => {
            const user = await User.findById(user_id)
            if (!user) throw Error('User doesnt exist')
            if (!user.presentations.find(presentation => presentation._id.toString() === presentation_id))
                throw Error('Presentation doesnt exist')
            const presentation = await Presentation.findById(presentation_id)
            presentation.slides.push(new Slide({ style }))
            await presentation.save()
        })()
    },

    deleteSlide(user_id, presentation_id, slide_id) {
        validate.arguments([
            { name: 'slide_id', value: slide_id, type: 'string', notEmpty: true },
            { name: 'presentation_id', value: presentation_id, type: 'string', notEmpty: true },
            { name: 'user_id', value: user_id, type: 'string', notEmpty: true },
        ])
        return (async () => {
            const user = await User.findById(user_id)
            if (!user) throw Error('User doesnt exist')
            if (!user.presentations.find(presentation => presentation._id.toString() === presentation_id))
                throw Error('Presentation doesnt exist')
            const presentation = await Presentation.findById(presentation_id)
            const slides = presentation.slides.filter(slide => {
                return !((slide._id.toString()) === slide_id)
            })
            presentation.slides = slides
            await presentation.save()
        })()
    },

    createElement(user_id, presentation_id, slide_id, style, type, content) {
        validate.arguments([
            { name: 'user_id', value: user_id, type: 'string', notEmpty: true },
            { name: 'presentation_id', value: presentation_id, type: 'string', notEmpty: true },
            { name: 'slide_id', value: slide_id, type: 'string', notEmpty: true },
            { name: 'style', value: style, type: 'string', notEmpty: true },
            { name: 'type', value: type, type: 'string', notEmpty: true }
        ])
        return (async () => {
            const user = await User.findById(user_id)
            if (!user) throw Error('User doesnt exist')
            if (!user.presentations.find(presentation => presentation._id.toString() === presentation_id))
                throw Error('Presentation doesnt exist')
            const presentation = await Presentation.findById(presentation_id)
            const slideIndex = presentation.slides.findIndex(slide => slide._id.toString() === slide_id)
            if (slideIndex === -1) throw Error('Slide doesnt exist')
            const element = new Element({ style, type, content })
            presentation.slides[slideIndex].elements.push(element)
            await presentation.save()
            return element

        })()
    },

    deleteElement(user_id, presentation_id, slide_id, elementId) {
        validate.arguments([
            { name: 'user_id', value: user_id, type: 'string', notEmpty: true },
            { name: 'presentation_id', value: presentation_id, type: 'string', notEmpty: true },
            { name: 'slide_id', value: slide_id, type: 'string', notEmpty: true },
            { name: 'elementId', value: elementId, type: 'string', notEmpty: true }
        ])
        return (async () => {
            const user = await User.findById(user_id)
            if (!user) throw Error('User doesnt exist')
            if (!user.presentations.find(presentation => presentation._id.toString() === presentation_id))
                throw Error('Presentation doesnt exist')
            const presentation = await Presentation.findById(presentation_id)
            const slideIndex = presentation.slides.findIndex(slide => slide._id.toString() === slide_id)
            if (slideIndex === -1) throw Error('Slide doesnt exist')
            const elements = presentation.slides[slideIndex].elements.filter(element => {
                return !((element._id.toString()) === elementId)
            })
            presentation.slides[slideIndex].elements = elements
            await presentation.save()
        })()
    }
}
module.exports = logic