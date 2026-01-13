import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import CheckoutWizard from '@/components/checkout/CheckoutWizard';

const CheckoutWizardPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const checkoutId = searchParams.get('checkoutId');

    const handleClose = () => {
        navigate('/checkout');
    };

    return (
        <DashboardLayout title="Checkout Wizard">
            <CheckoutWizard
                checkoutId={checkoutId || null}
                onClose={handleClose}
            />
        </DashboardLayout>
    );
};

export default CheckoutWizardPage;

