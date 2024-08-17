import requests

users = [
    "0xacb",
    "0xd0m7",
    "82af5ddffbb795",
    "ajxchapman",
    "alexbirsan",
    "anshuman_bh",
    "archangel",
    "arneswinner",
    "avishai",
    "cache-money",
    "cdl",
    "corb3nik",
    "cr3scent",
    "dawgyg",
    "derision",
    "dki",
    "dzmitry",
    "ereisr00",
    "f6x",
    "fabian",
    "fr4via",
    "francisbeaudoin",
    "hacktus",
    "hogarth45",
    "hussein98d",
    "inhibitor181",
    "intidc",
    "jaren",
    "johnh4x0r",
    "johnny",
    "jonathanbouman",
    "luc1f3rhk1",
    "matanber",
    "mayonaise",
    "meals",
    "michael1026",
    "ngalog",
    "ngocdh",
    "niemand_sec",
    "nnwakelam",
    "none_of_the_above",
    "not-an-aardvark",
    "ralamosm",
    "rhynorater",
    "rijalrojan",
    "ryotak",
    "sam0",
    "samux",
    "shubs",
    "spaceraccoon",
    "stealthy",
    "ta8ahi",
    "todayisnew",
    "try_to_hack",
    "vakzz",
    "yassineaboukir",
    "zlz",
    "zseano",
]

for user in users:
    r = requests.post(
        "https://hackerone.com/graphql",
        json={
            "operationName": "UserBadgesQuery",
            "variables": {"username":user,"product_area":"other","product_feature":"other"},
            "query": "query UserBadgesQuery($username: String!) {\n  me {\n    id\n    username\n    ...UserProfileMe\n    ...UserStatsMe\n    __typename\n  }\n  user(username: $username) {\n    id\n    username\n    all_badges: badges(first: 100) {\n      edges {\n        awarded_at\n        node {\n          id\n          name\n          description\n          image_path\n          category\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    ...UserStatsUser\n    ...UserProfileUser\n    ...UserProfileCardUser\n    ...CreditsUser\n    ...ReviewUser\n    ...BadgesUser\n    __typename\n  }\n}\n\nfragment UserProfileMe on User {\n  id\n  username\n  __typename\n}\n\nfragment UserProfileUser on User {\n  id\n  username\n  __typename\n}\n\nfragment UserProfileCardUser on User {\n  id\n  created_at\n  location\n  website\n  bio\n  name\n  username\n  profile_picture(size: large)\n  bugcrowd_handle\n  hack_the_box_handle\n  github_handle\n  gitlab_handle\n  linkedin_handle\n  twitter_handle\n  cleared\n  verified\n  open_for_employment\n  ...FollowUser\n  __typename\n}\n\nfragment FollowUser on User {\n  id\n  followed\n  __typename\n}\n\nfragment CreditsUser on User {\n  id\n  username\n  resolved_report_count\n  thanks_item_count: thanks_items {\n    total_count\n    __typename\n  }\n  __typename\n}\n\nfragment ReviewUser on User {\n  id\n  public_reviews(first: 5) {\n    edges {\n      node {\n        id\n        public_feedback\n        team {\n          id\n          name\n          handle\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment BadgesUser on User {\n  id\n  username\n  badges(first: 3) {\n    edges {\n      awarded_at\n      node {\n        id\n        name\n        image_path\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment UserStatsMe on User {\n  id\n  __typename\n}\n\nfragment UserStatsUser on User {\n  id\n  username\n  __typename\n}\n"
        }
    )

    try:
        badges = [x["node"] for x in r.json()["data"]["user"]["all_badges"]["edges"]]
        badges = filter(lambda x: x["category"] == "live_hacking_event", badges)
        for x in badges:
            print(f"{x['name']}|{x['description']}|{user}")
    except:
        print(f"Error|Error|{user}")

