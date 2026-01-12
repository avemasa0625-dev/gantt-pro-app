import type { Part, ProcessTemplate, PartWithProcesses, ScheduleRow, Product, JoinedWorkData } from '../types';

export const linkPartsToProcesses = (parts: Part[], templates: ProcessTemplate[]): PartWithProcesses[] => {
    return parts.map(part => ({
        ...part,
        processes: templates
            .filter(t => t.process_category === part.process_category)
            .sort((a, b) => a.process_order - b.process_order)
    }));
};

export const createJoinedDataset = (
    schedule: ScheduleRow[],
    products: Product[],
    parts: PartWithProcesses[]
): JoinedWorkData[] => {
    return schedule.map(row => {
        const product = products.find(p => p.product_id === row.product_id);
        const part = parts.find(p => p.part_id === row.part_id);

        if (!product || !part) {
            console.warn(`[Data Join Failure] PartID: ${row.part_id}`, {
                productID: row.product_id,
                productFound: !!product,
                partFound: !!part
            });
        }

        return {
            ...row,
            // ScheduleRow に product_quantity という名前で定義したので、不整合は消えます
            processes: part ? part.processes : []
        };
    });
};