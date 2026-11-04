import { useApp } from '../state/AppState';
import { FilterBar } from '../components/FilterBar';
import { EmployeeTable } from '../components/EmployeeTable';
import { Section, PageHeader } from '../components/ui';

export default function EmployeesPage() {
  const { filtered } = useApp();
  return (
    <div>
      <PageHeader title="Employee Directory" subtitle="Search and open any employee's talent profile" />
      <FilterBar showYear={false} />
      <Section title="Employees">
        <EmployeeTable employees={filtered} pageSize={25} extraCols={[{ key: 'departmentName', label: 'Department' }, { key: 'reviewerName', label: 'Reviewer' }]} />
      </Section>
    </div>
  );
}
