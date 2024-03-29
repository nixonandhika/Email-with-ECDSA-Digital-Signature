import { Router } from 'express';
import Container from 'typedi';
import { Logger } from '../../loaders/logger';
import EmailService from '../../services/email';
import { ResponseCreator } from '../../utils/utils';
import { isAuthenticated } from '../middleware/auth';

export default (app: Router) => {
    const route = Router();
    let logger: Logger = Container.get('logger');
    let emailService = Container.get(EmailService);

    route.get('/', isAuthenticated, async (req, res) => {
        try {
            const user = req.user as any;
            const refreshToken = user.refreshToken;

            const type = req.query.type as string;

            let emails = await emailService.GetEmails(refreshToken, type.toUpperCase());
            let payload = { emails, user_email: user.email };

            const { response, status } = ResponseCreator(payload);
            res.status(status).send(response);
        } catch (error) {
            logger.error(error, {}, 'Failed getting emails');
            res.status(500).send(error);
        }
    });

    route.post('/', isAuthenticated, async (req, res, next) => {
        try {
            const { encrypt, signature } = req.query;
            const { emailText, key, destination, subject } = req.body;

            let result = await emailService.SendEmail(
                req.user,
                subject,
                emailText,
                key,
                destination,
                encrypt === 'true',
                signature === 'true',
            );
            const { response, status } = ResponseCreator(result);
            res.status(status).send(response);
        } catch (error) {
            logger.error(error, {}, 'Failed to send email');
            next(error);
        }
    });

    route.post('/verification', async (req, res, next) => {
        try {
            const decrypt = req.query.decrypt === 'true';
            const verifySignature = req.query.verify_signature === 'true';

            const { body, key } = req.body;

            let result = await emailService.Verification(body, key, decrypt, verifySignature);

            const { response, status } = ResponseCreator(result);
            res.status(status).send(response);
        } catch (error) {
            logger.error(error, {}, 'Failed to do verification');
            next(error);
        }
    });

    app.use('/email', route);
};
