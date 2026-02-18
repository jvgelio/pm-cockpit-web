import { useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/overlay/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form/form'
import { Input } from '@/components/ui/form/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Users } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import type { Team, Product } from '@/types'

const productSchema = z.object({
    id: z.string().min(1, 'ID é obrigatório'),
    name: z.string().min(1, 'Nome do produto é obrigatório'),
    status: z.enum(['active', 'maintenance', 'deprecated'] as const).default('active'),
})

const teamSchema = z.object({
    name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
    products: z.array(productSchema).min(1, 'Adicione pelo menos um produto'),
})

type TeamFormValues = z.infer<typeof teamSchema>

interface TeamModalProps {
    team?: Team
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function TeamModal({ team, open, onOpenChange }: TeamModalProps) {
    const { createTeam, updateTeam } = useAppStore()

    const form = useForm<TeamFormValues>({
        resolver: zodResolver(teamSchema) as any,
        defaultValues: {
            name: '',
            products: [{ id: 'p1', name: '', status: 'active' }],
        },
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'products',
    })

    useEffect(() => {
        if (open) {
            if (team) {
                form.reset({
                    name: team.name,
                    products: team.products.map(p => ({
                        id: p.id,
                        name: p.name,
                        status: p.status,
                    })),
                })
            } else {
                form.reset({
                    name: '',
                    products: [{ id: 'p1', name: '', status: 'active' }],
                })
            }
        }
    }, [open, team, form])

    const onSubmit = async (values: TeamFormValues) => {
        const teamData = {
            name: values.name,
            products: values.products.map(p => ({
                id: p.id,
                name: p.name,
                status: p.status as 'active' | 'maintenance' | 'deprecated',
            })) as Product[],
        }

        if (team) {
            await updateTeam(team.id, teamData)
        } else {
            await createTeam(teamData)
        }
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <Users className="h-5 w-5" />
                        <DialogTitle className="text-xl">
                            {team ? 'Editar Time' : 'Criar Novo Time'}
                        </DialogTitle>
                    </div>
                    <DialogDescription>
                        Configure os detalhes do seu time e os produtos associados.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }: { field: any }) => (
                                    <FormItem>
                                        <FormLabel>Nome do Time</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Time de Crescimento" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium">Produtos do Time</h4>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 gap-1 text-xs"
                                        onClick={() => append({ id: `p${fields.length + 1}`, name: '', status: 'active' })}
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Adicionar Produto
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="group relative bg-muted/30 rounded-lg p-3 border border-border/40">
                                            <div className="grid grid-cols-12 gap-3 items-end">
                                                <div className="col-span-11 grid grid-cols-12 gap-2">
                                                    <div className="col-span-4">
                                                        <FormField
                                                            control={form.control}
                                                            name={`products.${index}.id`}
                                                            render={({ field }: { field: any }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">ID</FormLabel>
                                                                    <FormControl>
                                                                        <Input className="h-8 text-xs bg-background" {...field} />
                                                                    </FormControl>
                                                                    <FormMessage className="text-[10px]" />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="col-span-8">
                                                        <FormField
                                                            control={form.control}
                                                            name={`products.${index}.name`}
                                                            render={({ field }: { field: any }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Nome</FormLabel>
                                                                    <FormControl>
                                                                        <Input className="h-8 text-xs bg-background" placeholder="Produto X" {...field} />
                                                                    </FormControl>
                                                                    <FormMessage className="text-[10px]" />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                                        disabled={fields.length === 1}
                                                        onClick={() => remove(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {form.formState.errors.products && (
                                    <p className="text-sm font-medium text-destructive">
                                        {form.formState.errors.products.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="p-6 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit">
                                {team ? 'Salvar Alterações' : 'Criar Time'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
