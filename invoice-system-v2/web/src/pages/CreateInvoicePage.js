import { useNavigate } from "react-router-dom";
import InvoiceForm from "../components/InvoiceForm";
import { createInvoice } from "../services/api";

const CreateInvoicePage = () => {
  const navigate = useNavigate();

  const handleCreate = async (payload) => {
    const invoice = await createInvoice(payload);
    navigate(`/invoice/${invoice.id}`);
  };

  return (
    <div className="grid">
      <h1 className="page-title">Generate Invoice</h1>
      <p className="muted">Invoice numbers auto-generate. Add client, dates, and line items; final amount is calculated.</p>
      <InvoiceForm onSubmit={handleCreate} />
    </div>
  );
};

export default CreateInvoicePage;
