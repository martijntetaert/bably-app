<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import DrawerComponent from '@/components/drawer-component.vue';
import FormComponent from '@/components/form/form-component.vue';
import InputComponent from '@/components/form/input-component.vue';
import ButtonComponent from '@/components/button-component.vue';
import SectionLabelComponent from '@/components/section-label-component.vue';
import SegmentedControlComponent from '@/components/segmented-control-component.vue';
import StepperComponent from '@/components/stepper-component.vue';
import ConfirmDialogComponent from '@/components/confirm-dialog-component.vue';
import { TaskFields, tasks } from '@/api/bably';
import { useSession } from '@/composables/useSession';
import { useToast } from '@/composables/useToast';
import { now } from '@/composables/useDateTime';
import { TaskInterface } from '@/interfaces/TaskInterface';
import { UserInterface } from '@/interfaces/UserInterface';
import { RecurrenceInterface, RecurrenceValue } from '@/interfaces/RecurrenceInterface';
import { useHouseholdTasks } from '@/views/household/composables/useHouseholdTasks';
import { useSubmission } from '@/views/household/composables/useSubmission';

type When = 'today' | 'tomorrow' | 'other';

const props = defineProps<{
    task: TaskInterface | null;
    title: string;
    members?: UserInterface[];
    recurrences?: RecurrenceInterface[];
}>();

const open = defineModel<boolean>('open', { required: true });

const session = useSession();
const toast = useToast();
const { reloadTasks } = useHouseholdTasks();
const submission = useSubmission();

const today = (): string => now().toISODate() ?? '';
const tomorrow = (): string => now().plus({ days: 1 }).toISODate() ?? '';

const whenOptions: { value: When; label: string }[] = [
    { value: 'today', label: 'Vandaag' },
    { value: 'tomorrow', label: 'Morgen' },
    { value: 'other', label: 'Andere dag' },
];

const form = ref<{
    title: string;
    userIdentifier: string;
    dueOn: string;
    recurrence: RecurrenceValue;
    recurrenceInterval: number;
    recurrenceDays: number[];
}>({
    title: '',
    userIdentifier: '',
    dueOn: today(),
    recurrence: 'none',
    recurrenceInterval: 1,
    recurrenceDays: [],
});

const weekdays = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const weekdayNames = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];

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
    const rhythm =
        form.value.recurrenceInterval <= 1 ? `Elke ${one}` : `Om de ${form.value.recurrenceInterval} ${many}`;

    if (form.value.recurrence !== 'weekly' || form.value.recurrenceDays.length === 0) {
        return rhythm;
    }

    const names = [...form.value.recurrenceDays].sort((a, b) => a - b).map((day) => weekdayNames[day - 1]);
    const last = names.pop();

    return `${rhythm} op ${names.length === 0 ? last : `${names.join(', ')} en ${last}`}`;
});

const toggleWeekday = (day: number): void => {
    form.value.recurrenceDays = form.value.recurrenceDays.includes(day)
        ? form.value.recurrenceDays.filter((chosen) => chosen !== day)
        : [...form.value.recurrenceDays, day];
};

const when = ref<When>('today');
const isConfirmingDelete = ref(false);
const isDeleting = ref(false);

const recurrenceOptions = computed(() =>
    (props.recurrences ?? []).map((recurrence) => ({
        value: recurrence.value,
        label: recurrence.label,
    })),
);

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

    submission.clearErrors();
    form.value.title = props.title;
    // A new task lands on you, so your name is the one already chosen.
    form.value.userIdentifier =
        props.task?.user.identifier ??
        props.members?.find((member) => member.email === session.user.value?.email)?.identifier ??
        '';
    form.value.dueOn = props.task && !props.task.overdue ? props.task.dueOn : today();
    form.value.recurrence = props.task?.recurrence.value ?? 'none';
    form.value.recurrenceInterval = props.task?.recurrence.interval ?? 1;
    form.value.recurrenceDays = props.task?.recurrence.days ?? [];
    when.value = whenFor(form.value.dueOn);
});

watch(when, (value) => {
    if (value === 'today') {
        form.value.dueOn = today();
    }

    if (value === 'tomorrow') {
        form.value.dueOn = tomorrow();
    }
});

const fields = (): TaskFields => ({
    title: form.value.title.trim(),
    userIdentifier: form.value.userIdentifier || undefined,
    dueOn: form.value.dueOn,
    recurrence: form.value.recurrence,
    recurrenceInterval: form.value.recurrenceInterval,
    recurrenceDays: form.value.recurrence === 'weekly' ? form.value.recurrenceDays : null,
});

const save = async (): Promise<void> => {
    const task = props.task;
    const saved = await submission.submit(() =>
        task ? tasks.update(task.identifier, fields()) : tasks.create(fields()),
    );

    if (saved) {
        open.value = false;
        await reloadTasks();
    }
};

const destroy = async (): Promise<void> => {
    if (!props.task) {
        return;
    }

    isDeleting.value = true;

    try {
        await tasks.remove(props.task.identifier);
        isConfirmingDelete.value = false;
        open.value = false;
        await reloadTasks();
    } catch (error) {
        toast.failure(error);
    } finally {
        isDeleting.value = false;
    }
};

const errors = submission.errors;
const processing = submission.processing;
</script>
<template>
    <section class="section-portal-household-tasks-edit-task">
        <drawer-component v-model:open="open" :title="task ? 'Taak bewerken' : 'Nieuwe taak'">
            <form-component class="form" @submit="save()">
                <input-component
                    v-model="form.title"
                    name="title"
                    placeholder="Vuilbak buitenzetten"
                    autocomplete="off"
                    required
                />
                <p v-if="errors.title" class="error">
                    {{ errors.title }}
                </p>

                <div class="field">
                    <section-label-component>Wie</section-label-component>
                    <div v-if="members" class="people" role="radiogroup" aria-label="Wie">
                        <button
                            v-for="member in members"
                            :key="member.identifier"
                            type="button"
                            role="radio"
                            :aria-checked="(form.userIdentifier || null) === member.identifier"
                            :class="{
                                'is-active': form.userIdentifier === member.identifier,
                            }"
                            @click="form.userIdentifier = member.identifier"
                        >
                            {{ member.displayName }}
                        </button>
                    </div>
                    <div v-else class="people-skeleton"></div>
                    <p v-if="errors.userIdentifier" class="error">
                        {{ errors.userIdentifier }}
                    </p>
                </div>

                <div class="field">
                    <section-label-component>Wanneer</section-label-component>
                    <segmented-control-component v-model="when" :options="whenOptions" label="Wanneer" />
                    <input
                        v-if="when === 'other'"
                        v-model="form.dueOn"
                        class="date"
                        type="date"
                        :min="today()"
                        aria-label="Datum"
                        required
                    />
                    <p v-if="errors.dueOn" class="error">
                        {{ errors.dueOn }}
                    </p>
                </div>

                <div class="field">
                    <section-label-component>Herhaling</section-label-component>
                    <segmented-control-component
                        v-if="recurrences"
                        v-model="form.recurrence"
                        :options="recurrenceOptions"
                        label="Herhaling"
                    />
                    <div v-else class="segment-skeleton"></div>
                    <div v-if="form.recurrence !== 'none'" class="rhythm">
                        <div class="every">
                            <span class="title"> Om de hoeveel {{ unit[1] }}? </span>
                            <stepper-component
                                v-model="form.recurrenceInterval"
                                :min="1"
                                :max="30"
                                label="Om de hoeveel"
                            ></stepper-component>
                        </div>
                        <div
                            v-if="form.recurrence === 'weekly'"
                            class="weekdays"
                            role="group"
                            aria-label="Op welke dagen"
                        >
                            <button
                                v-for="(weekday, index) in weekdays"
                                :key="weekday"
                                type="button"
                                :aria-pressed="form.recurrenceDays.includes(index + 1)"
                                :class="{
                                    'is-active': form.recurrenceDays.includes(index + 1),
                                }"
                                @click="toggleWeekday(index + 1)"
                            >
                                {{ weekday }}
                            </button>
                        </div>
                        <p class="summary">{{ summary }}</p>
                    </div>
                </div>

                <button-component v-if="task?.can.delete" variant="danger" @click="isConfirmingDelete = true">
                    Taak verwijderen
                </button-component>

                <div class="actions">
                    <button-component type="submit" :disabled="processing || form.title.trim() === ''">
                        Bewaren
                    </button-component>
                    <button-component variant="ghost" @click="open = false"> Annuleren </button-component>
                </div>
            </form-component>
        </drawer-component>

        <confirm-dialog-component
            v-if="task"
            v-model:open="isConfirmingDelete"
            title="Taak verwijderen?"
            :description="`'${task.title}' verdwijnt uit de lijst van het huishouden.`"
            :processing="isDeleting"
            @confirm="destroy()"
        />
    </section>
</template>
<style scoped>
@import '@css/pages/portal/household/tasks/sections/edit-task.css';
</style>
