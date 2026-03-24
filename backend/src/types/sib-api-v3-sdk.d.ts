declare module 'sib-api-v3-sdk' {
  namespace SibApiV3Sdk {
    class ApiClient {
      static instance: any;
    }
    class TransactionalEmailsApi {
      sendTransacEmail(data: any): Promise<any>;
    }
    class SendSmtpEmail {
      subject: string;
      htmlContent: string;
      sender: { name: string; email: string };
      to: { email: string; name?: string }[];
    }
  }
  const SibApiV3Sdk: any;
  export default SibApiV3Sdk;
}
