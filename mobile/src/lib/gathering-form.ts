type GatheringForm = {
  title: string;
  description: string;
  topic: string;
  name: string;
  date: string;
  time: string;
  zone: string;
  capacity: string;
  minutes: string;
  occurrences: string;
  now: boolean;
  weekly: boolean;
};

function wholeNumberInRange(value: string, min: number, max: number) {
  return (
    /^\d+$/.test(value.trim()) && Number(value) >= min && Number(value) <= max
  );
}

// Return the labels in form order so the host can correct everything in one pass.
export function gatheringFieldsToCheck(form: GatheringForm): string[] {
  const fields: string[] = [];
  if (form.title.trim().length < 3) fields.push("gatheringTitleLabel");
  if (form.description.trim().length < 10)
    fields.push("gatheringDescriptionLabel");
  if (!form.topic.trim()) fields.push("topic");
  if (!form.name.trim()) fields.push("hostName");
  if (!form.now) {
    if (form.weekly && !wholeNumberInRange(form.occurrences, 2, 52))
      fields.push("sessionCount");
    if (!form.date) fields.push("dateLabel");
    if (!form.time) fields.push("timeLabel");
  }
  if (!form.zone.trim()) fields.push("timezone");
  if (!wholeNumberInRange(form.capacity, 2, 100)) fields.push("capacity");
  if (!wholeNumberInRange(form.minutes, 15, 180)) fields.push("duration");
  return fields;
}
