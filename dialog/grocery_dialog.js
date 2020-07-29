const {
    ComponentDialog,
    ConfirmPrompt,
    DialogSet,
    DialogTurnStatus,
    NumberPrompt,
    TextPrompt,
    WaterfallDialog
} = require('botbuilder-dialogs');
const { UserProfile } = require('./user_profile');

const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const PHONE_PROMPT = 'PHONE_PROMPT';
const ADDRESS_PROMPT = 'ADDRESS_PROMPT';
const USER_PROFILE = 'USER_PROFILE';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
const PROFILE_DIALOG = 'PROFILE_DIALOG';
const ITEM_PROMPT = 'ITEM_PROMPT';
const QUANT_PROMPT = 'QUANT_PROMPT';
const CHOICE_PROMPT = 'CHOICE_PROMPT';
const ORDER = 'ORDER';

class ProfileDialog extends ComponentDialog {
    constructor(userState) {
        super(PROFILE_DIALOG);

        this.userProfile = userState.createProperty(USER_PROFILE);
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new NumberPrompt(PHONE_PROMPT));
        this.addDialog(new TextPrompt(ADDRESS_PROMPT));
        this.addDialog(new TextPrompt(ITEM_PROMPT));
        this.addDialog(new NumberPrompt(QUANT_PROMPT));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.nameStep.bind(this),
            this.phoneStep.bind(this),
            this.addressStep.bind(this),
            this.confirmStep.bind(this),
            this.summaryStep.bind(this),
            this.itemStep.bind(this),
            this.quantStep.bind(this),
            this.orderConfirmStep.bind(this),
            this.orderSummaryStep.bind(this)
        ]));
        this.initialDialogId = WATERFALL_DIALOG;
    }

    async nameStep(step) {
        return await step.prompt(NAME_PROMPT, 'Welcome to the grocery ordering platform. Please enter your name.');
    }

    async phoneStep(step) {
        step.values.name = step.result;
        // We can send messages to the user at any point in the WaterfallStep.
        await step.context.sendActivity(`Thanks ${ step.result }.`);

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        return await step.prompt(PHONE_PROMPT, 'what is your phone number? ');
    }

    async addressStep(step) {
        step.values.phone = step.result;
        await step.context.sendActivity(`Your phone number is ${ step.result }`);

        return await step.prompt(ADDRESS_PROMPT, 'What is your address?');
    }

    async confirmStep(step) {
        step.values.address = step.result;
        //  console.log(step);
        await step.context.sendActivity(`Your address is ${ step.result }`);

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        return await step.prompt(CONFIRM_PROMPT, { prompt: 'Is the info correct?' });
    }

    async summaryStep(step) {
        if (step.result) {
            // Get the current profile object from user state.
            const userProfile = await this.userProfile.get(step.context, new UserProfile());

            userProfile.name = step.values.name;
            userProfile.address = step.values.address;
            userProfile.phone = step.values.phone;

            const msg = `I have your name as ${ userProfile.name }, your phone number as ${ userProfile.phone } and your address as ${ userProfile.address } . `;
            await step.context.sendActivity(msg);
        } else {
            return await step.replaceDialog(PROFILE_DIALOG);
        }

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is the end.
        return await step.next();
    }

    async itemStep(step) {
        step.values.order = {};
        return await step.prompt(ITEM_PROMPT, 'What item do you want?');
    }

    async quantStep(step) {
        const item = step.result;
        step.values.cur = item;
        step.values.order[item] = 1;
        await step.context.sendActivity(`You are ordering ${ item }`);
        return await step.prompt(QUANT_PROMPT, 'How much do you want?');
    }

    async orderConfirmStep(step) {
        step.values.order[step.values.cur] = step.result;
        await step.context.sendActivity(`You are ordering ${ step.result } of ${ step.values.cur }`);
        //  continue ordering or finish ordering
        return await step.prompt(CONFIRM_PROMPT, 'Do you want to order more items?', [['yes', 'no']]);
    }

    async orderSummaryStep(step) {
        //  TO-DO: store the user state
        if (step.result) { // continue ordering
          //  console.log()
            step.activeDialog.state["stepIndex"] = step.activeDialog.state["stepIndex"] -4;
            return await step.next();
        } else { // finish ordering
            const order = step.values.order;
            let msg = 'Your order is below:\r\n';
            for (var i in step.values.order) {
                msg += `${ i }: ${ step.values.order[i] }\r\n`;
                order[i] = step.values.order[i];
            }
            await step.context.sendActivity(msg);
            return await step.endDialog();
        }
    }

    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }
}

module.exports = { ProfileDialog };
