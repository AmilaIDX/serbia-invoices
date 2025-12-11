import { useNavigate } from "react-router-dom";
import InvoiceForm from "../components/InvoiceForm";
import { createInvoice } from "../services/api";

const CreateInvoicePage = () => {
  const navigate = useNavigate();

  const handleCreate = async (payload) => {
    const invoice = await createInvoice(payload);
    navigate(`/invoices/${invoice.id}`);
    return invoice;
  };

  return (
    <div className="grid">
      <h1 className="page-title">Create Invoice</h1>
      <p className="muted">Generate a secure invoice number, attach a client, and build a clean PDF-ready invoice.</p>
      <InvoiceForm onSubmit={handleCreate} />
    </div>
  );
};

export default CreateInvoicePage;
