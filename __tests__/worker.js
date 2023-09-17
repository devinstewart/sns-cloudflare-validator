import  { Validator }  from '../lib';
import { rest, setupWorker } from 'msw';

export default {

    async fetch(request) {

        try {
            const { cerificatePem } = require('./mocks/pems.js');
            const { signingCertUrl } = require('./mocks/signingCertUrl.js');

            const worker = setupWorker(
                rest.get(signingCertUrl, (_req, res, ctx) => {

                    return res(ctx.text(cerificatePem));
                })
            );
            worker.start();

            const validator = new Validator();
            const payload = await validator.validate(request);
            return new Response(JSON.stringify(payload), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
        catch (error) {
            console.log(error);
            return new Response(error.message || error.toString(), {
                status: 400,
                headers: {
                    'Content-Type': 'text/plain'
                }
            });
        }
    }
};
