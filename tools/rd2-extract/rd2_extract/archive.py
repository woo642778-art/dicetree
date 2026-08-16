from dataclasses import asdict, dataclass
from pathlib import Path
from zipfile import BadZipFile, ZipFile


@dataclass(frozen=True)
class ClientArchiveIndex:
    members: tuple[str, ...]
    info_plists: tuple[str, ...]
    global_metadata: tuple[str, ...]
    unity_framework: tuple[str, ...]
    data_assets: tuple[str, ...]
    localization_candidates: tuple[str, ...]

    def to_dict(self) -> dict[str, list[str]]:
        return {key: list(value) for key, value in asdict(self).items()}


def _matches(members: tuple[str, ...], predicate) -> tuple[str, ...]:
    return tuple(member for member in members if predicate(member))


def discover_client_files(ipa_path: Path) -> ClientArchiveIndex:
    """Index interesting archive members without extracting or executing them."""
    try:
        with ZipFile(ipa_path) as archive:
            members = tuple(sorted(archive.namelist()))
    except BadZipFile as exc:
        raise ValueError(f"Invalid IPA/ZIP archive: {ipa_path}") from exc

    lowercase = {member: member.lower() for member in members}
    return ClientArchiveIndex(
        members=members,
        info_plists=_matches(members, lambda member: member.endswith("/Info.plist")),
        global_metadata=_matches(members, lambda member: member.endswith("/global-metadata.dat")),
        unity_framework=_matches(
            members,
            lambda member: "/Frameworks/UnityFramework.framework/" in member
            or member.endswith("/Frameworks/UnityFramework.framework/UnityFramework"),
        ),
        data_assets=_matches(
            members,
            lambda member: any(
                token in lowercase[member]
                for token in (
                    "data.unity3d",
                    "globalgamemanagers",
                    "resources.assets",
                    "sharedassets",
                    "/level0",
                    "/level1",
                )
            ),
        ),
        localization_candidates=_matches(
            members,
            lambda member: any(
                token in lowercase[member]
                for token in (
                    "localization",
                    "localisation",
                    "locale",
                    "language",
                    "languages",
                    "strings",
                )
            ),
        ),
    )
