const getKeys = (type) => {

    if (type === 'SubscriptionConfirmation' || type === 'UnsubscribeConfirmation') {
        return ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'];
    }

    if (type === 'Notification') {
        return ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type'];
    }

    throw new Error('Invalid Type');
};

export { getKeys };
