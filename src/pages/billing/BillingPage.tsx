import React from 'react';
import { Header } from '@/components/layout/Header/Header';
import { BillingTab } from '@/pages/dashboard/tabs/BillingTab';
import styles from './BillingPage.module.css';

export const BillingPage: React.FC = () => {
  const breadcrumbItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Cobranca' },
  ];

  return (
    <div className={styles.container}>
      <Header breadcrumbItems={breadcrumbItems} />
      <main className={styles.content}>
        <BillingTab />
      </main>
    </div>
  );
};
