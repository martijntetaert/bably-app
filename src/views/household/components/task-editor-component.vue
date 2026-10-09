<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonModal,
    IonNote,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    IonTitle,
    IonToolbar,
} from '@ionic/vue';
import { add, remove, trashOutline } from 'ionicons/icons';
import { tasks, TaskFields } from '@/api/bably';
import { ApiError } from '@/api/client';
import { useConfirm } from '@/composables/useConfirm';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';
import { RecurrenceInterface, RecurrenceValue } from '@/interfaces/RecurrenceInterface';
import { TaskInterface } from '@/interfaces/TaskInterface';
import { UserInterface } from '@/interfaces/UserInterface';
import { today, tomorrow } from '@/views/household/composables/useTaskDates';

type When = 'today' | 'tomorrow' | 'other';

const props = defineProps<{
    task: TaskInterface | null;
    title: string;
    members: UserInterface[];
    recurrences: RecurrenceInterface[];
}>();

const emit = defineEmits<{
    saved: [];
}>();

const open = defineModel<boolean>('open', { required: true });

const session = useSession();
const toast = useToast();
const confirm = useConfirm();

const weekdays = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const weekdayNames = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];

const form = ref({
    title: '',
    userIdentifier: '',
    dueOn: today(),
    recurrence: 'none' as RecurrenceValue,
    recurrenceInterval: 1,
    recurrenceDays: [] as number[],
});
const when = ref<When>('today');
const errors = ref<Record<string, string[]>>({});
const busy = ref(false);

const unit = computed(() => {
    switch (form.value.recurrence) {
        case 'daily':
            return ['dag', 'dagen'];
        case 'weekly':
            return ['week', 'weken'];
        default:
            return ['maand', 'maanden'];
    }
});

// The same sentence the server writes on the task (TaskRecurrence::describe).
const summary = computed(() => {
    const [one, many] = unit.value;
    const interval = form.value.recurrenceInterval;
    const rhythm = interval <= 1 ? `Elke ${one}` : `Om de ${interval} ${many}`;

    if (form.value.recurrence !== 'weekly' || form.value.recurrenceDays.length === 0) {
        return rhythm;
    }

    const names = [...form.value.recurrenceDays].sort((a, b) => a - b).map((day) => weekdayNames[day - 1]);
    const last = names.pop();

    return `${rhythm} op ${names.length === 0 ? last : `${names.join(', ')} en ${last}`}`;
});

const canSave = computed(() => !busy.value && form.value.title.trim() !== '');

const whenFor = (dueOn: string): When => {
    if (dueOn === today()) {
        return 'today';
    }

    return dueOn === tomorrow() ? 'tomorrow' : 'other';
};

watch(open, (isOpen) => {
    if (!isOpen) {
        return;
    }

    errors.value = {};
    form.value = {
        title: props.title,
        // A new task lands on you, so your name is the one already chosen.
        userIdentifier: props.task?.user.identifier ?? session.user.value?.identifier ?? '',
        dueOn: props.task && !props.task.overdue ? props.task.dueOn : today(),
        recurrence: props.task?.recurrence.value ?? 'none',
        recurrenceInterval: props.task?.recurrence.interval ?? 1,
        recurrenceDays: props.task?.recurrence.days ?? [],
    };
    when.value = whenFor(form.value.dueOn);
});

const chooseWhen = (value: When): void => {
    when.value = value;

    if (value === 'today') {
        form.value.dueOn = today();
    }

    if (value === 'tomorrow') {
        form.value.dueOn = tomorrow();
    }
};

const stepInterval = (step: number): void => {
    form.value.recurrenceInterval = Math.min(30, Math.max(1, form.value.recurrenceInterval + step));
};

const toggleWeekday = (day: number): void => {
    const days = form.value.recurrenceDays;

    form.value.recurrenceDays = days.includes(day) ? days.filter((chosen) => chosen !== day) : [...days, day];
};

const fields = (): TaskFields => ({
    title: form.value.title.trim(),
    userIdentifier: form.value.userIdentifier || undefined,
    dueOn: form.value.dueOn,
    recurrence: form.value.recurrence,
    recurrenceInterval: form.value.recurrenceInterval,
    recurrenceDays: form.value.recurrence === 'weekly' ? form.value.recurrenceDays : null,
});

const save = async (): Promise<void> => {
    if (!canSave.value) {
        return;
    }

    busy.value = true;
    errors.value = {};

    try {
        if (props.task) {
            await tasks.update(props.task.identifier, fields());
        } else {
            await tasks.create(fields());
        }

        open.value = false;
        emit('saved');
    } catch (error) {
        if (error instanceof ApiError && error.status === 422) {
            errors.value = error.errors;
        } else {
            await toast.failure(error);
        }
    } finally {
        busy.value = false;
    }
};

const destroy = async (): Promise<void> => {
    const task = props.task;

    if (!task || !(await confirm('Taak verwijderen?', `'${task.title}' verdwijnt uit de lijst van het huishouden.`))) {
        return;
    }

    busy.value = true;

    try {
        await tasks.remove(task.identifier);
        open.value = false;
        emit('saved');
    } catch (error) {
        await toast.failure(error);
    } finally {
        busy.value = false;
    }
};

const firstError = (field: string): string | undefined => errors.value[field]?.[0];
</script>
<template>
    <ion-modal :is-open="open" @did-dismiss="open = false">
        <ion-header>
            <ion-toolbar>
                <ion-buttons slot="start">
                    <ion-button @click="open = false">Annuleren</ion-button>
                </ion-buttons>
                <ion-title>{{ task ? 'Taak bewerken' : 'Nieuwe taak' }}</ion-title>
                <ion-buttons slot="end">
                    <ion-button :strong="true" :disabled="!canSave" @click="save">
                        <ion-spinner v-if="busy" name="crescent"></ion-spinner>
                        <span v-else>Bewaren</span>
                    </ion-button>
                </ion-buttons>
            </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
            <form class="form" @submit.prevent="save">
                <ion-input
                    v-model="form.title"
                    label="Taak"
                    label-placement="stacked"
                    fill="outline"
                    placeholder="Vuilbak buitenzetten"
                    autocapitalize="sentences"
                    :class="{ 'ion-invalid ion-touched': firstError('title') }"
                    :error-text="firstError('title')"
                ></ion-input>

                <div class="field">
                    <h3 class="label">Wie</h3>
                    <div class="chips" role="radiogroup" aria-label="Wie">
                        <button
                            v-for="member in members"
                            :key="member.identifier"
                            type="button"
                            role="radio"
                            class="chip"
                            :aria-checked="form.userIdentifier === member.identifier"
                            :class="{ 'is-active': form.userIdentifier === member.identifier }"
                            @click="form.userIdentifier = member.identifier"
                        >
                            {{ member.displayName }}
                        </button>
                    </div>
                    <ion-note v-if="firstError('userIdentifier')" color="danger">{{ firstError('userIdentifier') }}</ion-note>
                </div>

                <div class="field">
                    <h3 class="label">Wanneer</h3>
                    <ion-segment :value="when" @ion-change="chooseWhen($event.detail.value as When)">
                        <ion-segment-button value="today">Vandaag</ion-segment-button>
                        <ion-segment-button value="tomorrow">Morgen</ion-segment-button>
                        <ion-segment-button value="other">Andere dag</ion-segment-button>
                    </ion-segment>
                    <ion-input
                        v-if="when === 'other'"
                        v-model="form.dueOn"
                        type="date"
                        :min="today()"
                        aria-label="Datum"
                        fill="outline"
                    ></ion-input>
                    <ion-note v-if="firstError('dueOn')" color="danger">{{ firstError('dueOn') }}</ion-note>
                </div>

                <div class="field">
                    <h3 class="label">Herhaling</h3>
                    <ion-segment v-model="form.recurrence" :scrollable="true">
                        <ion-segment-button v-for="recurrence in recurrences" :key="recurrence.value" :value="recurrence.value">
                            {{ recurrence.label }}
                        </ion-segment-button>
                    </ion-segment>
                    <div v-if="form.recurrence !== 'none'" class="rhythm">
                        <div class="every">
                            <span>Om de hoeveel {{ unit[1] }}?</span>
                            <div class="stepper">
                                <ion-button
                                    fill="clear"
                                    size="small"
                                    aria-label="Minder"
                                    :disabled="form.recurrenceInterval <= 1"
                                    @click="stepInterval(-1)"
                                >
                                    <ion-icon slot="icon-only" :icon="remove"></ion-icon>
                                </ion-button>
                                <span class="value">{{ form.recurrenceInterval }}</span>
                                <ion-button
                                    fill="clear"
                                    size="small"
                                    aria-label="Meer"
                                    :disabled="form.recurrenceInterval >= 30"
                                    @click="stepInterval(1)"
                                >
                                    <ion-icon slot="icon-only" :icon="add"></ion-icon>
                                </ion-button>
                            </div>
                        </div>
                        <div v-if="form.recurrence === 'weekly'" class="weekdays" role="group" aria-label="Op welke dagen">
                            <button
                                v-for="(weekday, index) in weekdays"
                                :key="weekday"
                                type="button"
                                class="chip"
                                :aria-pressed="form.recurrenceDays.includes(index + 1)"
                                :class="{ 'is-active': form.recurrenceDays.includes(index + 1) }"
                                @click="toggleWeekday(index + 1)"
                            >
                                {{ weekday }}
                            </button>
                        </div>
                        <p class="summary">{{ summary }}</p>
                    </div>
                    <ion-note v-if="firstError('recurrence')" color="danger">{{ firstError('recurrence') }}</ion-note>
                    <ion-note v-if="firstError('recurrenceInterval')" color="danger">{{ firstError('recurrenceInterval') }}</ion-note>
                    <ion-note v-if="firstError('recurrenceDays')" color="danger">{{ firstError('recurrenceDays') }}</ion-note>
                </div>

                <ion-button v-if="task?.can.delete" expand="block" fill="clear" color="danger" :disabled="busy" @click="destroy">
                    <ion-icon slot="start" :icon="trashOutline"></ion-icon>
                    Taak verwijderen
                </ion-button>
            </form>
        </ion-content>
    </ion-modal>
</template>
<style scoped>
.form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
}

.label {
    margin: 0;
    color: var(--bably-muted-text);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.chips,
.weekdays {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.chip {
    min-height: 2.5rem;
    padding: 0 1rem;
    border: 1px solid var(--bably-border);
    border-radius: 999px;
    background: var(--bably-card);
    color: var(--ion-text-color);
    font: inherit;
    font-weight: 600;
}

.weekdays .chip {
    min-width: 2.75rem;
    padding: 0;
}

.chip.is-active {
    border-color: var(--ion-color-primary);
    background: var(--bably-accent-soft);
    color: var(--ion-color-primary);
}

.rhythm {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: var(--bably-radius-row);
    background: var(--bably-muted);
}

.every {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    font-weight: 600;
}

.stepper {
    display: flex;
    align-items: center;
    border-radius: 999px;
    background: var(--bably-card);
}

.stepper .value {
    min-width: 1.5rem;
    font-variant-numeric: tabular-nums;
    text-align: center;
}

.summary {
    margin: 0;
    color: var(--bably-muted-text);
    font-size: 0.875rem;
}
</style>
