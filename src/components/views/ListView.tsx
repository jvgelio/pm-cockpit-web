import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/appStore'
import { InitiativeRow } from '@/components/shared/InitiativeRow'
import { Card } from '@/components/shared/Card'
import type { Initiative } from '@/types'

interface ListViewProps {
    initiatives: Initiative[]
}

function ListView({ initiatives }: ListViewProps) {
    const { selectInitiative } = useAppStore()
    const navigate = useNavigate()

    const handleInitiativeClick = (initiative: Initiative) => {
        selectInitiative(initiative.id)
        navigate(`/initiative/${initiative.id}`)
    }

    return (
        <Card className="flex flex-col h-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header - could add sorting/filtering controls here later */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
                {initiatives.length === 0 ? (
                    <div className="flex h-full items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400">
                        <p>Nenhuma iniciativa encontrada.</p>
                    </div>
                ) : (
                    initiatives.map((initiative) => (
                        <InitiativeRow
                            key={initiative.id}
                            initiative={initiative}
                            onClick={() => handleInitiativeClick(initiative)}
                        />
                    ))
                )}
            </div>
        </Card>
    )
}

export default ListView
